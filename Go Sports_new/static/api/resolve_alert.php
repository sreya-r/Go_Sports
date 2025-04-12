<?php
header('Content-Type: application/json');
require_once __DIR__.'/../../config/db_config.php';

$data = json_decode(file_get_contents('php://input'), true);
$equipmentId = $data['equipment_id'] ?? null;

try {
    $conn = new mysqli(
        $db_config['localhost'],
        $db_config['sreya'],
        $db_config['sreya'],
        $db_config['sports_inventory']
    );
    
    $stmt = $conn->prepare("UPDATE equipment SET min_stock_level = ? WHERE equipment_id = ?");
    $newMin = 0;
    $stmt->bind_param("ii", $newMin, $equipmentId);
    $stmt->execute();
    
    echo json_encode(['success' => true]);
    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>