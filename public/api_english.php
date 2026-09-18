<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$action = $_GET['action'] ?? '';
$db = getDB();

try {
    if ($action === 'get_progress') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare('SELECT * FROM english_progress WHERE child_id = ?');
        $stmt->execute([$data['childId']]);
        $progress = $stmt->fetch();
        if ($progress) {
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'userId' => $progress['user_id'],
                    'childId' => $progress['child_id'],
                    'currentLevel' => $progress['current_level'],
                    'points' => $progress['points'],
                    'completedLessons' => json_decode($progress['completed_lessons'] ?: '[]', true),
                    'lastActive' => $progress['last_active'],
                    'streak' => $progress['streak']
                ]
            ]);
        } else {
            echo json_encode(['status' => 'not_found']);
        }
    } else if ($action === 'save_progress') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("
            INSERT INTO english_progress (user_id, child_id, current_level, points, completed_lessons, last_active, streak)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              current_level = VALUES(current_level),
              points = VALUES(points),
              completed_lessons = VALUES(completed_lessons),
              last_active = VALUES(last_active),
              streak = VALUES(streak)
        ");
        $stmt->execute([
            $data['userId'],
            $data['childId'],
            $data['currentLevel'],
            $data['points'],
            json_encode($data['completedLessons'] ?: []),
            $data['lastActive'],
            $data['streak']
        ]);
        echo json_encode(['status' => 'success']);
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
