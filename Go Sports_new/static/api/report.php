<?php
header('Content-Type: application/json');
require_once __DIR__.'/../../config/db_config.php';

// Initialize response array
$response = [
    'success' => false,
    'error' => null,
    'equipment' => [],
    'stats' => []
];

try {
    // Validate database configuration
    if (!isset($db_config['host'], $db_config['username'], $db_config['password'], $db_config['database'])) {
        throw new Exception('Database configuration is incomplete');
    }

    // Create database connection with error handling
    $conn = new mysqli(
        $db_config['localhost'],
        $db_config['sreya'],
        $db_config['sreya'],
        $db_config['sorts_inventory']
    );

    // Check connection
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }

    // Set charset to prevent SQL injection
    $conn->set_charset("utf8mb4");

    // Prepare and execute equipment query
    $equipmentQuery = "
        SELECT 
            e.equipment_id,
            e.name,
            e.description,
            e.quantity,
            e.min_stock_level,
            e.created_at,
            c.name as category_name, 
            (SELECT IFNULL(SUM(quantity), 0) FROM checkouts 
             WHERE equipment_id = e.equipment_id AND status = 'checked_out') as checked_out
        FROM equipment e
        LEFT JOIN categories c ON e.category_id = c.category_id
    ";

    $equipmentResult = $conn->query($equipmentQuery);
    if ($equipmentResult === false) {
        throw new Exception("Equipment query failed: " . $conn->error);
    }

    $response['equipment'] = $equipmentResult->fetch_all(MYSQLI_ASSOC);

    // Prepare and execute stats query
    $statsQuery = "
        SELECT 
            COUNT(*) as total_items,
            SUM(IF(quantity <= min_stock_level, 1, 0)) as low_stock_items,
            (SELECT IFNULL(SUM(quantity), 0) FROM checkouts WHERE status = 'checked_out') as total_checked_out
        FROM equipment
    ";

    $statsResult = $conn->query($statsQuery);
    if ($statsResult === false) {
        throw new Exception("Stats query failed: " . $conn->error);
    }

    $response['stats'] = $statsResult->fetch_assoc();
    $response['success'] = true;

} catch (Exception $e) {
    // Log the error (in a real application, use a proper logging system)
    error_log($e->getMessage());
    $response['error'] = 'An error occurred while fetching inventory data';
} finally {
    // Close connection if it exists
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

    // Send JSON response
    echo json_encode($response);
}