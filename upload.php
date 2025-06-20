<?php
header("Access-Control-Allow-Origin: *"); // For production, restrict this to your app's domain, e.g., https://your-app.web.app
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle pre-flight OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$response = ['success' => false, 'url' => '', 'error' => ''];

// IMPORTANT: Create this directory on your server and make it writable by the web server user (e.g., www-data).
$uploadDir = 'uploads/'; 
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if (isset($_FILES['file'])) {
    $file = $_FILES['file'];

    if ($file['error'] === UPLOAD_ERR_OK) {
        // Sanitize the filename to prevent security issues
        $baseName = preg_replace("/[^a-zA-Z0-9\._-]/", "", basename($file['name']));
        $fileName = uniqid() . '-' . $baseName;
        $targetPath = $uploadDir . $fileName;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            // IMPORTANT: Replace 'https://your-hosting-domain.com/' with the actual URL to your hosting.
            // This URL must be publicly accessible.
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
            $domainName = $_SERVER['HTTP_HOST'];
            $fileUrl = $protocol . $domainName . '/' . $targetPath;
            
            $response['success'] = true;
            $response['url'] = $fileUrl;
        } else {
            $response['error'] = 'Failed to move uploaded file. Check directory permissions.';
        }
    } else {
        $response['error'] = 'File upload error code: ' . $file['error'];
    }
} else {
    $response['error'] = 'No file was uploaded.';
}

header('Content-Type: application/json');
echo json_encode($response);
?>
