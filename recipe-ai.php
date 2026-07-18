<?php
/* ============================================================
   AI Recipe proxy for El Mundo Bakery
   ------------------------------------------------------------
   Keeps your AI API key on the server, never in the browser.
   Deploy to your Hostinger root, then in js/recipe-ai.js set:
     const AI_PROXY_URL = "https://yourdomain.com/recipe-ai.php";

   Works with Anthropic (Claude) OR Google Gemini — pick one,
   paste its key below, and set $PROVIDER accordingly.
   The browser sends { "prompt": "..." }, this returns { "text": "..." }.
   ============================================================ */

// ---- CHOOSE PROVIDER: "claude" or "gemini" ----
$PROVIDER = "claude";

// ---- PASTE THE KEY FOR YOUR CHOSEN PROVIDER ----
$CLAUDE_KEY = "sk-ant-REPLACE_WITH_YOUR_CLAUDE_KEY";
$GEMINI_KEY = "REPLACE_WITH_YOUR_GEMINI_KEY";

header("Access-Control-Allow-Origin: *"); // tighten to your domain in production
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header("Access-Control-Allow-Methods: POST, OPTIONS");
  header("Access-Control-Allow-Headers: Content-Type");
  exit;
}

$body = json_decode(file_get_contents("php://input"), true);
$prompt = isset($body['prompt']) ? $body['prompt'] : '';
if ($prompt === '') { http_response_code(400); echo json_encode(["text" => "", "error" => "No prompt"]); exit; }

function callClaude($prompt, $key) {
  $ch = curl_init("https://api.anthropic.com/v1/messages");
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
      "Content-Type: application/json",
      "x-api-key: " . $key,
      "anthropic-version: 2023-06-01",
    ],
    CURLOPT_POSTFIELDS => json_encode([
      "model" => "claude-sonnet-4-6",
      "max_tokens" => 1500,
      "messages" => [["role" => "user", "content" => $prompt]],
    ]),
    CURLOPT_TIMEOUT => 30,
  ]);
  $res = curl_exec($ch); curl_close($ch);
  $j = json_decode($res, true);
  $text = "";
  if (isset($j['content'])) foreach ($j['content'] as $b) if (isset($b['text'])) $text .= $b['text'];
  return $text;
}

function callGemini($prompt, $key) {
  $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $key;
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
    CURLOPT_POSTFIELDS => json_encode([
      "contents" => [["parts" => [["text" => $prompt]]]],
    ]),
    CURLOPT_TIMEOUT => 30,
  ]);
  $res = curl_exec($ch); curl_close($ch);
  $j = json_decode($res, true);
  return isset($j['candidates'][0]['content']['parts'][0]['text']) ? $j['candidates'][0]['content']['parts'][0]['text'] : "";
}

$text = ($PROVIDER === "gemini") ? callGemini($prompt, $GEMINI_KEY) : callClaude($prompt, $CLAUDE_KEY);
echo json_encode(["text" => $text]);
