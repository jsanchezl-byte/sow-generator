/**
 * @file AnalyticsEngine.gs
 * @description Processes audit logs to generate real-time dashboard statistics.
 */

function getDashboardStats() {
    // Fallback if no logs yet or error
    var stats = {
        totalSows: 0,
        hoursSaved: 0,
        topServices: [], 
        recentActivity: []
    };

    try {
        var ss;
        // Prioritize Config ID
        if (typeof CONFIG !== 'undefined' && CONFIG.SHEET_SERVICES_ID) {
           ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
        } else {
           // Fallback (might fail in WebApp)
           ss = SpreadsheetApp.getActiveSpreadsheet(); 
        }
        
        if (!ss) {
            console.warn("Analytics: No spreadsheet accessible.");
            return stats; 
        }


    var sheetName = (typeof CONFIG !== 'undefined' && CONFIG.sheets && CONFIG.sheets.AUDIT) ? CONFIG.sheets.AUDIT : "SOW_LOGS";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return stats; // No logs yet
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return stats; // Only headers
    
    // Read Data (Skip header)
    var data = sheet.getRange(2, 1, lastRow - 1, 6).getValues(); // Cols A to F (Timestamp...ServicesSummary)
    
    var successCount = 0;
    var serviceCounts = {};
    
    // Traverse backwards for recency
    for (var i = data.length - 1; i >= 0; i--) {
        var row = data[i];
        var timestamp = row[0];
        var status = row[1];
        var client = row[3];
        var servicesStr = row[4]; // "SOC (Gold), Pentest (Standard)"
        
        if (status === 'SUCCESS') {
            successCount++;
            
            // Add Recency (Top 3)
            if (stats.recentActivity.length < 3) {
                // Calc relative time logic could be here, but simpler to send string
                // or just "Client Name"
                stats.recentActivity.push({
                   client: client,
                   services: servicesStr,
                   date: timestamp 
                });
            }
            
            // Count Services
            if (servicesStr) {
                var services = servicesStr.split(', ');
                services.forEach(function(s) {
                    // Extract clean name "SOC (Gold)" -> "SOC"
                    var cleanName = s.split('(')[0].trim();
                    if(!serviceCounts[cleanName]) serviceCounts[cleanName] = 0;
                    serviceCounts[cleanName]++;
                });
            }
        }
    }
    
    stats.totalSows = successCount;
    stats.hoursSaved = Math.round(successCount * 1.5); // Assumption: 90 mins saved per Auto-SOW
    
    // Sort Top Services
    var sortedServices = [];
    for (var name in serviceCounts) {
        sortedServices.push({name: name, count: serviceCounts[name]});
    }
    sortedServices.sort(function(a, b) { return b.count - a.count; });
    stats.topServices = sortedServices.slice(0, 3); // Get Top 3
    
    return stats;
    
  } catch (e) {
    console.error("Analytics Error: " + e.message);
    return stats;
  }
}
