<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$action = $_GET['action'] ?? '';
$userId = $_GET['userId'] ?? '';
$childId = $_GET['childId'] ?? '';
$id = $_GET['id'] ?? '';
$db = getDB();

try {
    if ($action === 'get_study_data') {
        $stmt = $db->prepare('SELECT * FROM books WHERE userId = ? AND childId = ?');
        $stmt->execute([$userId, $childId]);
        $books = $stmt->fetchAll();
        $stmt = $db->prepare('SELECT * FROM study_tasks WHERE childId = ?');
        $stmt->execute([$childId]);
        $tasks = $stmt->fetchAll();
        echo json_encode([
            'books' => array_map(function($b) {
                $b['topics'] = json_decode($b['topics'] ?: '[]', true);
                return $b;
            }, $books),
            'tasks' => array_map(function($t) {
                return [
                    'id' => $t['id'],
                    'bookId' => $t['bookId'],
                    'childId' => $t['childId'],
                    'topicIndex' => $t['topicIndex'],
                    'topicTitle' => $t['topicTitle'],
                    'pointsReward' => $t['points_reward'],
                    'status' => $t['status'],
                    'summary' => $t['summary'],
                    'handwritingImage' => $t['handwriting_image'],
                    'aiFeedbackChild' => $t['ai_feedback_child'],
                    'aiFeedbackParent' => $t['ai_feedback_parent'],
                    'medicalEvaluation' => $t['medical_evaluation'],
                    'aiScore' => $t['ai_score'],
                    'completedAt' => $t['completed_at'],
                    'createdAt' => $t['created_at']
                ];
            }, $tasks)
        ]);
    } else if ($action === 'add_book') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare('INSERT INTO books (id, userId, childId, isbn, title, subject, grade, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$data['id'], $userId, $data['childId'], $data['isbn'], $data['title'], $data['subject'], $data['grade'], json_encode($data['topics'])]);
        echo json_encode(['success' => true]);
    } else if ($action === 'delete_book') {
        $stmt = $db->prepare('DELETE FROM books WHERE id = ? AND userId = ?');
        $stmt->execute([$id, $userId]);
        echo json_encode(['success' => true]);
    } else if ($action === 'add_study_task') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare('INSERT INTO study_tasks (id, bookId, childId, topicIndex, topicTitle, points_reward) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$data['id'], $data['bookId'], $data['childId'], $data['topicIndex'], $data['topicTitle'], $data['pointsReward']]);
        echo json_encode(['success' => true]);
    } else if ($action === 'complete_study_task') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare('UPDATE study_tasks SET status = "completed", summary = ?, handwriting_image = ?, ai_feedback_child = ?, ai_feedback_parent = ?, medical_evaluation = ?, ai_score = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$data['summary'], $data['handwritingImage'] ?: null, $data['aiFeedbackChild'], $data['aiFeedbackParent'], $data['medicalEvaluation'] ?: null, $data['aiScore'], $data['id']]);
        
        $updatePoints = $db->prepare('UPDATE children SET points = points + ? WHERE id = ?');
        $updatePoints->execute([$data['pointsReward'], $data['childId']]);
        echo json_encode(['success' => true]);
    } else if ($action === 'save_calligraphy_session') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare('INSERT INTO calligraphy_sessions (id, userId, childId, imageUrl, score, analysis_json, timestamp, parentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$data['id'], $userId, $data['childId'], $data['imageUrl'], $data['score'], json_encode($data['analysis']), $data['timestamp'], $data['parentId'] ?: null]);
        echo json_encode(['success' => true]);
    } else if ($action === 'get_calligraphy_history') {
        $stmt = $db->prepare('SELECT * FROM calligraphy_sessions WHERE childId = ? ORDER BY timestamp DESC');
        $stmt->execute([$childId]);
        $sessions = $stmt->fetchAll();
        echo json_encode(array_map(function($s) {
            $s['analysis'] = json_decode($s['analysis_json'] ?: '{}', true);
            return $s;
        }, $sessions));
    } else if ($action === 'save_math_session') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare('INSERT INTO math_sessions (id, userId, childId, imageUrl, score, analysis_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$data['id'], $userId, $data['childId'], $data['imageUrl'], $data['score'], json_encode($data['analysis']), $data['timestamp']]);
        echo json_encode(['success' => true]);
    } else if ($action === 'get_math_history') {
        $stmt = $db->prepare('SELECT * FROM math_sessions WHERE childId = ? ORDER BY timestamp DESC');
        $stmt->execute([$childId]);
        $sessions = $stmt->fetchAll();
        echo json_encode(array_map(function($s) {
            $s['analysis'] = json_decode($s['analysis_json'] ?: '{}', true);
            return $s;
        }, $sessions));
    } else if ($action === 'save_reading_session') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare('INSERT INTO reading_sessions (id, userId, childId, audioUrl, score, analysis_json, timestamp, transcription) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$data['id'], $userId, $data['childId'], $data['audioUrl'] ?: null, $data['score'], json_encode($data['analysis']), $data['timestamp'], $data['transcription'] ?: null]);
        echo json_encode(['success' => true]);
    } else if ($action === 'get_reading_history') {
        $stmt = $db->prepare('SELECT * FROM reading_sessions WHERE childId = ? ORDER BY timestamp DESC');
        $stmt->execute([$childId]);
        $sessions = $stmt->fetchAll();
        echo json_encode(array_map(function($s) {
            $s['analysis'] = json_decode($s['analysis_json'] ?: '{}', true);
            return $s;
        }, $sessions));
    } else if ($action === 'get_srs_reviews') {
        $stmt = $db->prepare('SELECT * FROM srs_reviews WHERE childId = ? AND status = "pending"');
        $stmt->execute([$childId]);
        $reviews = $stmt->fetchAll();
        echo json_encode($reviews);
    } else if ($action === 'add_srs_review') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare('INSERT INTO srs_reviews (id, childId, topic, subject, scheduledDate, sourceId) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$data['id'], $data['childId'], $data['topic'], $data['subject'], $data['scheduledDate'], $data['sourceId']]);
        echo json_encode(['success' => true]);
    } else if ($action === 'complete_srs_review') {
        $stmt = $db->prepare('UPDATE srs_reviews SET status = "completed" WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
