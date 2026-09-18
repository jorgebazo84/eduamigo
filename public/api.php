<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$action = $_GET['action'] ?? '';
$userId = $_GET['userId'] ?? '';
$id = $_GET['id'] ?? '';
$db = getDB();

try {
    switch ($action) {
        case 'get_initial_data':
            $stmt = $db->prepare("SELECT * FROM children WHERE parentId = ?");
            $stmt->execute([$userId]);
            $children = $stmt->fetchAll();

            $stmt = $db->prepare("SELECT * FROM rewards WHERE userId = ?");
            $stmt->execute([$userId]);
            $rewards = $stmt->fetchAll();

            $stmt = $db->prepare("SELECT * FROM history WHERE childId IN (SELECT id FROM children WHERE parentId = ?) ORDER BY timestamp DESC LIMIT 100");
            $stmt->execute([$userId]);
            $history = $stmt->fetchAll();

            $stmt = $db->prepare("SELECT * FROM exam_results WHERE childId IN (SELECT id FROM children WHERE parentId = ?) ORDER BY timestamp DESC LIMIT 50");
            $stmt->execute([$userId]);
            $exams = $stmt->fetchAll();

            $stmt = $db->prepare("SELECT * FROM calendar_events WHERE childId IN (SELECT id FROM children WHERE parentId = ?)");
            $stmt->execute([$userId]);
            $events = $stmt->fetchAll();

            $stmt = $db->prepare("SELECT * FROM tasks WHERE childId IN (SELECT id FROM children WHERE parentId = ?)");
            $stmt->execute([$userId]);
            $tasks = $stmt->fetchAll();

            $stmt = $db->prepare("SELECT * FROM student_requests WHERE childId IN (SELECT id FROM children WHERE parentId = ?)");
            $stmt->execute([$userId]);
            $requests = $stmt->fetchAll();

            $stmt = $db->prepare("SELECT * FROM school_communications WHERE childId IN (SELECT id FROM children WHERE parentId = ?)");
            $stmt->execute([$userId]);
            $comms = $stmt->fetchAll();

            $stmt = $db->prepare("SELECT * FROM quick_notes WHERE childId IN (SELECT id FROM children WHERE parentId = ?)");
            $stmt->execute([$userId]);
            $notes = $stmt->fetchAll();

            $stmt = $db->prepare("SELECT * FROM ai_corrections WHERE childId IN (SELECT id FROM children WHERE parentId = ?)");
            $stmt->execute([$userId]);
            $corrections = $stmt->fetchAll();

            $stmt = $db->prepare("SELECT * FROM academic_grades WHERE childId IN (SELECT id FROM children WHERE parentId = ?)");
            $stmt->execute([$userId]);
            $grades = $stmt->fetchAll();

            $stmt = $db->prepare("SELECT * FROM daily_study_reports WHERE childId IN (SELECT id FROM children WHERE parentId = ?)");
            $stmt->execute([$userId]);
            $dailyReports = $stmt->fetchAll();
            foreach ($dailyReports as &$dr) {
                $dr['topicIndices'] = json_decode($dr['topicIndices'] ?: '[]', true);
            }

            $stmt = $db->prepare("SELECT * FROM review_plans WHERE childId IN (SELECT id FROM children WHERE parentId = ?)");
            $stmt->execute([$userId]);
            $reviewPlans = $stmt->fetchAll();
            foreach ($reviewPlans as &$rp) {
                $rp['tasks'] = json_decode($rp['tasks'] ?: '[]', true);
            }

            $stmt = $db->prepare("SELECT * FROM books WHERE childId IN (SELECT id FROM children WHERE parentId = ?)");
            $stmt->execute([$userId]);
            $books = $stmt->fetchAll();

            foreach ($history as &$h) {
                $h['answer'] = json_decode($h['answer_json'] ?: '{}', true);
                unset($h['answer_json']);
            }

            foreach ($books as &$b) {
                $b['topics'] = json_decode($b['topics'] ?: '[]', true);
            }

            echo json_encode([
                'children' => $children,
                'rewards' => $rewards,
                'history' => $history,
                'examHistory' => $exams,
                'events' => $events,
                'tasks' => $tasks,
                'requests' => $requests,
                'communications' => $comms,
                'quickNotes' => $notes,
                'aiCorrections' => $corrections,
                'academicGrades' => $grades,
                'books' => $books,
                'dailyReports' => $dailyReports,
                'reviewPlans' => $reviewPlans
            ]);
            break;

        case 'add_child':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO children (id, parentId, name, avatar, points, grade, country, streak_current, streak_lastActive, streak_multiplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['id'], $userId, $data['name'], $data['avatar'], $data['points'], $data['grade'], 
                $data['country'] ?? 'España', $data['streak']['current'] ?? 0, $data['streak']['lastActive'] ?? 0, $data['streak']['multiplier'] ?? 1
            ]);
            echo json_encode(['status' => 'success']);
            break;

        case 'update_child':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("UPDATE children SET name = ?, grade = ?, avatar = ? WHERE id = ?");
            $stmt->execute([$data['name'], $data['grade'], $data['avatar'], $id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'delete_child':
            $stmt = $db->prepare("DELETE FROM children WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'add_reward':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO rewards (id, userId, title, pointsCost, icon) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$data['id'], $userId, $data['title'], $data['pointsCost'], $data['icon']]);
            echo json_encode(['status' => 'success']);
            break;

        case 'delete_reward':
            $stmt = $db->prepare("DELETE FROM rewards WHERE id = ? AND userId = ?");
            $stmt->execute([$id, $userId]);
            echo json_encode(['status' => 'success']);
            break;

        case 'save_history':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO history (id, childId, grade, subject, region, question, answer_json, timestamp, duration, sentiment, imageUrl, audioUrl, transcription) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['id'], $data['childId'], $data['grade'], $data['subject'], $data['region'], 
                $data['question'], json_encode($data['answer']), $data['timestamp'],
                $data['duration'] ?? null, $data['sentiment'] ?? null, $data['imageUrl'] ?? null,
                $data['audioUrl'] ?? null, $data['transcription'] ?? null
            ]);
            echo json_encode(['status' => 'success']);
            break;

        case 'save_exam':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO exam_results (id, childId, grade, subject, topic, score, totalQuestions, strengths, weaknesses, studyGuideContent, pointsEarned, timestamp, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['id'], $data['childId'], $data['grade'], $data['subject'], $data['topic'], 
                $data['score'], $data['totalQuestions'], json_encode($data['strengths']), 
                json_encode($data['weaknesses']), $data['studyGuideContent'], $data['pointsEarned'], $data['timestamp'],
                $data['duration'] ?? null
            ]);
            echo json_encode(['status' => 'success']);
            break;

        case 'add_event':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO calendar_events (id, childId, title, date, type, description, notified) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['id'], $data['childId'], $data['title'], $data['date'], $data['type'], $data['description'] ?? '', $data['notified'] ? 1 : 0
            ]);
            echo json_encode(['status' => 'success']);
            break;

        case 'delete_event':
            $stmt = $db->prepare("DELETE FROM calendar_events WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'add_task':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO tasks (id, childId, title, dueDate, completed, priority) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['id'], $data['childId'], $data['title'], $data['dueDate'], 0, $data['priority']
            ]);
            echo json_encode(['status' => 'success']);
            break;

        case 'toggle_task':
            $stmt = $db->prepare("UPDATE tasks SET completed = 1 - completed WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'delete_task':
            $stmt = $db->prepare("DELETE FROM tasks WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'add_grade':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO academic_grades (id, childId, subject, gradeLevel, term, value, isNumeric, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['id'], $data['childId'], $data['subject'], $data['gradeLevel'], $data['term'], 
                $data['value'], $data['isNumeric'] ? 1 : 0, $data['timestamp']
            ]);
            echo json_encode(['status' => 'success']);
            break;

        case 'delete_grade':
            $stmt = $db->prepare("DELETE FROM academic_grades WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'add_ai_correction':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO ai_corrections (id, childId, subject, originalQuestion, incorrectAnswer, correction, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['id'], $data['childId'], $data['subject'], $data['originalQuestion'], 
                $data['incorrectAnswer'], $data['correction'], $data['timestamp']
            ]);
            echo json_encode(['status' => 'success']);
            break;

        case 'delete_ai_correction':
            $stmt = $db->prepare("DELETE FROM ai_corrections WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'add_quick_note':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO quick_notes (id, childId, text, timestamp, source) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['id'], $data['childId'], $data['text'], $data['timestamp'], $data['source']
            ]);
            echo json_encode(['status' => 'success']);
            break;

        case 'delete_quick_note':
            $stmt = $db->prepare("DELETE FROM quick_notes WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'mark_comm_read':
            $stmt = $db->prepare("UPDATE school_communications SET isRead = 1 WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'update_child_points':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("UPDATE children SET points = ?, streak_current = ?, streak_lastActive = ?, streak_multiplier = ? WHERE id = ?");
            $stmt->execute([
                $data['points'], $data['streak']['current'] ?? 0, $data['streak']['lastActive'] ?? 0, $data['streak']['multiplier'] ?? 1, $data['id']
            ]);
            echo json_encode(['status' => 'success']);
            break;

        case 'add_daily_report':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO daily_study_reports (id, childId, bookId, topicIndices, date, timestamp, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['id'], $data['childId'], $data['bookId'], json_encode($data['topicIndices']), 
                $data['date'], $data['timestamp'], $data['status']
            ]);
            echo json_encode(['status' => 'success']);
            break;

        case 'create_review_plan':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO review_plans (id, childId, reportId, date, difficulty, tasks, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['id'], $data['childId'], $data['reportId'], $data['date'], $data['difficulty'], 
                json_encode($data['tasks']), $data['status']
            ]);
            // Mark report as reviewed
            $stmt = $db->prepare("UPDATE daily_study_reports SET status = 'reviewed' WHERE id = ?");
            $stmt->execute([$data['reportId']]);
            echo json_encode(['status' => 'success']);
            break;

        case 'update_review_plan':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("UPDATE review_plans SET tasks = ?, status = ? WHERE id = ?");
            $stmt->execute([json_encode($data['tasks']), $data['status'], $id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'get_review_plans':
            $stmt = $db->prepare("SELECT * FROM review_plans WHERE childId = ?");
            $stmt->execute([$childId]);
            $plans = $stmt->fetchAll();
            foreach ($plans as &$p) {
                $p['tasks'] = json_decode($p['tasks'] ?: '[]', true);
            }
            echo json_encode($plans);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Acción no válida']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
