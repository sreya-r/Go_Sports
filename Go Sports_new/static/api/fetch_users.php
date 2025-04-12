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
    
    $result = $conn->query("SELECT user_id, username, full_name, role FROM users");
    $users = [];
    while ($row = $result->fetch_assoc()) $users[] = $row;
    
    echo json_encode(['success' => true, 'users' => $users]);
    $conn->close();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>