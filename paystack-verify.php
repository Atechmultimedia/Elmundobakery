<?php
/* ============================================================
   Paystack payment verifier for El Mundo Bakery
   ------------------------------------------------------------
   Deploy this file to your Hostinger site root, then set
   PAYSTACK_VERIFY_URL in home.html to its full URL, e.g.
     https://yourdomain.com/paystack-verify.php

   It confirms with Paystack's servers that a payment truly
   succeeded, using your SECRET key (kept only here, never in
   the browser). Returns Paystack's verification JSON.
   ============================================================ */

// ---- 1. PUT YOUR PAYSTACK SECRET KEY HERE (starts with sk_) ----
$SECRET_KEY = "sk_test_REPLACE_WITH_YOUR_SECRET_KEY";

// ---- CORS: allow your own site to call this ----
header("Access-Control-Allow-Origin: *"); // tighten to your domain in production
header("Content-Type: application/json");

$reference = isset($_GET['reference']) ? $_GET['reference'] : '';
if ($reference === '') {
  http_response_code(400);
  echo json_encode(["status" => false, "message" => "No reference supplied"]);
  exit;
}

// ---- Call Paystack's verify endpoint ----
$ch = curl_init("https://api.paystack.co/transaction/verify/" . rawurlencode($reference));
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer " . $SECRET_KEY,
    "Cache-Control: no-cache",
  ],
  CURLOPT_TIMEOUT => 20,
]);
$response = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);

if ($err) {
  http_response_code(502);
  echo json_encode(["status" => false, "message" => "Could not reach Paystack: " . $err]);
  exit;
}

// Pass Paystack's response straight back to the browser.
// The page checks: json.status === true && json.data.status === "success".
echo $response;
