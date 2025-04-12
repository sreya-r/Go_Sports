<?php
header('Content-Type: application/json');
require_once __DIR__.'/../../config/db_config.php';

try {
    $conn = new mysqli(
        $db_config['localhost'],
        $db_config['sreya'],
        $db_config['sreya'],
        $db_config['sports_inventory']
    );
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }

    // Dashboard stats
    $statsQuery = "
        SELECT 
            (SELECT COUNT(*) FROM equipment) as totalItems,
            (SELECT IFNULL(SUM(quantity), 0) FROM checkouts WHERE status = 'checked_out') as checkedOut,
            (SELECT COUNT(*) FROM equipment WHERE quantity <= min_stock_level) as lowStock,
            (SELECT COUNT(*) FROM checkouts WHERE status = 'checked_out' AND due_date < NOW()) as overdue
    ";
    $stats = $conn->query($statsQuery)->fetch_assoc();

    // Recent activity
    $activityQuery = "
        SELECT 
            c.checkout_id,
            e.name as equipment_name,
            u.full_name as user_name,
            c.quantity,
            c.checkout_date,
            c.due_date,
            c.status,
            CASE 
                WHEN c.status = 'checked_out' THEN 'checked out'
                WHEN c.status = 'returned' THEN 'returned'
                ELSE c.status
            END as action
        FROM checkouts c
        JOIN equipment e ON c.equipment_id = e.equipment_id
        JOIN users u ON c.user_id = u.user_id
        ORDER BY c.checkout_date DESC
        LIMIT 5
    ";
    $activity = [];
    $result = $conn->query($activityQuery);
    while ($row = $result->fetch_assoc()) $activity[] = $row;

    // Low stock alerts
    $alertsQuery = "
        SELECT equipment_id, name, quantity, min_stock_level
        FROM equipment WHERE quantity <= min_stock_level
    ";
    $alerts = [];
    $result = $conn->query($alertsQuery);
    while ($row = $result->fetch_assoc()) $alerts[] = $row;

    echo json_encode([
        'success' => true,
        'stats' => $stats,
        'activity' => $activity,
        'alerts' => $alerts
    ]);

    $conn->close();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>