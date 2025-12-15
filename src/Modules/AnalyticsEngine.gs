/**
 * @file AnalyticsEngine.gs
 * @description Processes audit logs to generate real-time dashboard statistics.
 */

function getDashboardStats() {
    // Fallback Mock Data for Executive Demo if no real data found
    var DEMO_DATA = {
        totalSows: 142,
        hoursSaved: 213, // 142 * 1.5
        completionRate: "98.5%",
        topServices: [
            { name: "SOC (Gold)", count: 45, pct: 31 },
            { name: "Pentest (Standard)", count: 32, pct: 22 },
            { name: "CISO as a Service", count: 20, pct: 14 }
        ],
        recentActivity: [
            { client: "Grupo Bimbo", services: "SOC (Gold)", date: new Date().toISOString() },
            { client: "Aeroméxico", services: "Pentest (Blackbox)", date: new Date(Date.now() - 86400000).toISOString() },
            { client: "Cemex", services: "Vulnerability Scan", date: new Date(Date.now() - 172800000).toISOString() }
        ]
    };

    var stats = {
        totalSows: 0,
        hoursSaved: 0,
        completionRate: "0%",
        topServices: [], 
        recentActivity: [],
        debug: { source: "Unknown", sheet: "None", fileId: "Unknown" }
    };

    try {
        var ss;
        // 1. Try Configured ID
        if (typeof CONFIG !== 'undefined' && CONFIG.SHEET_SERVICES_ID) {
           try { ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID); } catch(e) { console.warn("Config ID failed"); }
        }
        // 2. Fallback to Active
        if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
        
        if (!ss) {
            stats.debug.error = "No Spreadsheet Accessible";
            return stats;
        }
        
        stats.debug.fileName = ss.getName();
        stats.debug.fileId = ss.getId();

        // 3. Dynamic Sheet Discovery
        var sheets = ss.getSheets();
        var targetSheet = null;
        var cols = { status: -1, client: -1, services: -1, date: -1 };
        
        // Define Keywords (EN & ES)
        var KEYS = {
            STATUS: ['STATUS', 'ESTADO', 'ESTATUS', 'RESULT', 'RESULTADO'],
            CLIENT: ['CLIENT', 'CLIENTE', 'CUSTOMER', 'EMPRESA', 'CLIENT NAME', 'NOMBRE CLIENTE'],
            SERVICES: ['SERVICE', 'SERVICES', 'SERVICIO', 'SERVICIOS', 'SUMMARY', 'RESUMEN', 'SERVICES SUMMARY'],
            DATE: ['DATE', 'FECHA', 'TIMESTAMP', 'TIME', 'HORA', 'CREATED']
        };

        // Scan all sheets
        for (var i = 0; i < sheets.length; i++) {
            var s = sheets[i];
            var lastRow = s.getLastRow();
            if (lastRow < 2) continue; // Skip empty

            var headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
            var found = { status: -1, client: -1, services: -1, date: -1 };
            
            // Map Headers
            for (var c = 0; c < headers.length; c++) {
                var h = String(headers[c]).toUpperCase().trim();
                if (KEYS.STATUS.indexOf(h) > -1) found.status = c;
                else if (KEYS.CLIENT.indexOf(h) > -1) found.client = c;
                else if (KEYS.SERVICES.indexOf(h) > -1) found.services = c;
                else if (KEYS.DATE.indexOf(h) > -1) found.date = c;
            }
            
            // Criteria: Must have at least Status. Ideally Client too.
            if (found.status > -1) {
                targetSheet = s;
                cols = found;
                stats.debug.sheet = s.getName();
                stats.debug.cols = found;
                
                // Prefer 'SOW_LOGS' or 'AUDIT' if multiple matches, but take first valid for now
                var nameUp = s.getName().toUpperCase();
                if (nameUp.includes('LOG') || nameUp.includes('AUDIT') || nameUp.includes('SOW')) {
                    break; // Good enough match
                }
            }
        }

        if (!targetSheet) {
            stats.debug.error = "No valid Data Sheet in '" + ss.getName() + "'. Checked: " + sheets.map(s=>s.getName()).join(', ');
            return stats;
        }

        // 4. Extract Data using Dynamic Columns
        var lastRow = targetSheet.getLastRow();
        var dataRange = targetSheet.getRange(2, 1, lastRow - 1, targetSheet.getLastColumn());
        var data = dataRange.getValues();
        
        var successCount = 0;
        var totalAttempts = 0;
        var serviceCounts = {};

        // Traverse backwards
        for (var i = data.length - 1; i >= 0; i--) {
            var row = data[i];
            
            // Safe extraction
            var valStatus = (cols.status > -1) ? row[cols.status] : "";
            var valClient = (cols.client > -1) ? row[cols.client] : "Unknown Client";
            var valServices = (cols.services > -1) ? row[cols.services] : "";
            var valDate = (cols.date > -1) ? row[cols.date] : new Date();

            totalAttempts++;
            
            var sUpper = String(valStatus).toUpperCase().trim();
            // Robust Check: includes substring 'SUCCESS' or 'OK' or 'COMPLET'
            if (sUpper.includes('SUCCESS') || sUpper === 'OK' || sUpper.includes('COMPLET') || sUpper === 'GENERATED') {
                successCount++;
                
                // Recency
                if (stats.recentActivity.length < 5) {
                    stats.recentActivity.push({
                       client: valClient,
                       services: valServices,
                       date: valDate 
                    });
                }
                
                // Services
                if (valServices) {
                    var servicesList = String(valServices).split(/,\s*/);
                    servicesList.forEach(function(svc) {
                        var clean = svc.split('(')[0].trim();
                        if (clean.length > 2) { // Filter noise
                            if(!serviceCounts[clean]) serviceCounts[clean] = 0;
                            serviceCounts[clean]++;
                        }
                    });
                }
            }
        }
        
        stats.totalSows = successCount;
        stats.hoursSaved = Math.round(successCount * 1.5);
        stats.completionRate = totalAttempts > 0 ? Math.round((successCount / totalAttempts) * 100) + "%" : "0%";
        
        // Top Services Logic
        var sortedServices = [];
        var totalServiceMentions = 0;
        for (var name in serviceCounts) {
            sortedServices.push({name: name, count: serviceCounts[name]});
            totalServiceMentions += serviceCounts[name];
        }
        
        sortedServices.sort(function(a, b) { return b.count - a.count; });
        
        stats.topServices = sortedServices.slice(0, 3).map(function(s) {
             s.pct = totalServiceMentions > 0 ? Math.round((s.count / totalServiceMentions) * 100) : 0;
             return s;
        });

        // Debug Source Info
        stats.dataSource = stats.debug.sheet + " in " + stats.debug.fileName;

        return stats;

    } catch (e) {
        console.error("Analytics Error: " + e.message);
        stats.debug.error = e.message;
        return stats;
    }
}
