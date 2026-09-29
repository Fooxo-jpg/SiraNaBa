$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'deliverables'
$workDir = Join-Path $root 'tools\manual_word'
New-Item -ItemType Directory -Force -Path $outDir, $workDir | Out-Null

$htmlPath = Join-Path $workDir 'SiraNaBa_User_Manual.html'
$docxPath = Join-Path $outDir 'SiraNaBa_User_Manual_Small_Team.docx'
$pdfPath = Join-Path $workDir 'SiraNaBa_User_Manual_Small_Team.pdf'

$html = @'
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
@page { size: letter portrait; margin: 0.48in 0.58in 0.48in 0.58in; }
body { font-family: Aptos, Calibri, Arial, sans-serif; color: #1f2933; font-size: 9.5pt; line-height: 1.15; margin: 0; }
h1 { color: #000; font-size: 23pt; margin: 0 0 2pt 0; }
h2 { color: #000; font-size: 13.5pt; margin: 9pt 0 4pt 0; }
p { margin: 0 0 5pt 0; }
.subtitle { color: #2f6b4f; font-size: 10.5pt; font-weight: bold; margin-bottom: 7pt; }
.step { margin: 0 0 3pt 0; }
.step b, .feature b { color: #2f6b4f; }
.feature { margin: 0 0 4pt 0; }
.wireframe { width: 100%; border-collapse: separate; border-spacing: 8pt; margin: 5pt 0 1pt 0; }
.wireframe td { width: 33%; border: 1px solid #d9d9d9; background: #fff; padding: 10pt; vertical-align: top; }
.wireframe .metric { color: #2f6b4f; font-size: 16pt; font-weight: bold; padding: 8pt 0; }
.wireframe .button { background: #2f6b4f; color: white; font-weight: bold; text-align: center; padding: 6pt; margin-top: 8pt; }
.caption { color: #52606d; font-size: 8pt; text-align: center; margin-bottom: 1pt; }
.pagebreak { page-break-before: always; }
.grid { width: 100%; border-collapse: collapse; margin: 3pt 0 6pt 0; }
.grid th { background: #2f6b4f; color: white; border: 1px solid #d9d9d9; padding: 5pt 6pt; text-align: left; font-size: 8.3pt; }
.grid td { border: 1px solid #d9d9d9; padding: 4.5pt 6pt; vertical-align: middle; font-size: 7.8pt; line-height: 1.08; }
.grid tr.alt td { background: #f4f8f5; }
.event { width: 34%; }
.faq { width: 33%; }
.footer-note { font-size: 8.6pt; }
</style>
</head>
<body>
<h1>SiraNaBa User Manual</h1>
<p class="subtitle">End user guide for a small team of 5 to 20 users</p>
<p>SiraNaBa is a web-based facility portal for tenants and property staff. It keeps bills and payments, maintenance requests, AI-assisted ticket priority, and service notifications in one place. This guide explains the everyday tasks most users need.</p>

<h2>Getting Started</h2>
<p class="step"><b>1&nbsp;&nbsp; Open the portal&nbsp;&nbsp;</b> Use the web address supplied by your administrator in Chrome, Edge, Safari, or another current browser. No installation is required.</p>
<p class="step"><b>2&nbsp;&nbsp; Sign in&nbsp;&nbsp;</b> Enter your registered email address and password, then select <b>Sign In</b>. Administrators use the Admin Sign In page. Your role decides which screens you can see.</p>
<p class="step"><b>3&nbsp;&nbsp; Use the menu&nbsp;&nbsp;</b> Tenants use Dashboard, Maintenance, Billing, and Notifications. Property staff also use the administration area to manage tenants, payments, and ticket dispatch.</p>
<p class="step"><b>4&nbsp;&nbsp; Finish safely&nbsp;&nbsp;</b> Select <b>Sign Out</b> when using a shared device. Ask your administrator for a password reset if you cannot sign in.</p>

<h2>Three Main Features</h2>
<p class="feature"><b>Finance Management:</b> Review rent and utility balances, open itemised utility statements, record or simulate a payment, and keep the receipt reference. The payment screen clearly states when no real funds are transferred.</p>
<p class="feature"><b>Maintenance Tickets and AI Triage:</b> Submit the problem, location, severity information, and optional photos. SiraNaBa records the ticket and checks its urgency so staff can prioritise and assign the right person. Staff remain responsible for the final decision.</p>
<p class="feature"><b>Notifications:</b> See payment reminders, ticket progress, scheduled work, and facility notices. Opening an alert takes you to the related item and marks the alert as read.</p>

<table class="wireframe">
<tr>
<td><b>Finance Management</b><div class="metric">PHP 8,450.00</div>Rent balance<br>Utility statements<br>Payment history<div class="button">Pay Now</div></td>
<td><b>AI Ticket Triage</b><div class="metric">HIGH PRIORITY</div>Request received<br>Urgency checked<br>Staff assignment<div class="button">View Ticket</div></td>
<td><b>Notifications</b><div class="metric">3 UNREAD</div>Payment reminder<br>Ticket assigned<br>Facility notice<div class="button">Open Alerts</div></td>
</tr>
</table>
<p class="caption">Wireframe showing the three main areas in SiraNaBa</p>

<div class="pagebreak"></div>
<h2>What Happens When You Act</h2>
<p>An event is something you do or something that changes. The action is SiraNaBa's response.</p>
<table class="grid">
<tr><th class="event">Event</th><th>Action</th></tr>
<tr><td>You select Pay Now and confirm</td><td>The system validates the amount, updates the balance, adds the transaction to Payment History, and shows a receipt or failure message.</td></tr>
<tr class="alt"><td>You submit a maintenance request</td><td>The request receives a ticket number. AI triage checks the details and suggests a priority for staff review.</td></tr>
<tr><td>A staff member assigns or updates a ticket</td><td>The ticket timeline changes and a Maintenance notification appears for the tenant.</td></tr>
<tr class="alt"><td>A bill, due date, or payment changes</td><td>A Payments notification shows the new information and links to Billing.</td></tr>
<tr><td>You select a notification</td><td>The related bill, ticket, or notice opens and the notification is marked as read.</td></tr>
</table>

<h2>Quick How To</h2>
<p class="step"><b>Finance&nbsp;&nbsp; Open Billing&nbsp;&nbsp;</b> Check Total Outstanding and the due dates. Select Pay Now, choose Rent, Utilities, or Both, enter the amount, confirm, and save the reference code shown on the receipt.</p>
<p class="step"><b>Ticket&nbsp;&nbsp; Open Maintenance&nbsp;&nbsp;</b> Select Submit Maintenance Request. Complete Details, Location, Severity, and Review; add a clear photo when useful; then submit and track the status under Maintenance.</p>
<p class="step"><b>Alerts&nbsp;&nbsp; Open Notifications&nbsp;&nbsp;</b> Use All Alerts or a category filter, select an alert to open its related item, and use Mark all as read only after the team has handled the items.</p>

<h2>Troubleshooting and Frequently Asked Questions</h2>
<table class="grid">
<tr><th class="faq">Question</th><th>What to do</th></tr>
<tr><td><b>Why can I not sign in?</b></td><td>Check your email and password. Make sure you are using the tenant or admin sign-in page that matches your role. If it still fails, ask the administrator to confirm your account.</td></tr>
<tr class="alt"><td><b>Why did my event not trigger?</b></td><td>Refresh the page and wait briefly. Confirm the payment or ticket was successfully submitted. Check Notifications and its filters. If the item is still missing, report the time and ticket or receipt reference.</td></tr>
<tr><td><b>Why is ticket priority still loading?</b></td><td>The triage check may still be running or may not have enough information. Refresh Maintenance. Staff can review and update the priority if needed.</td></tr>
<tr class="alt"><td><b>Why did a payment fail?</b></td><td>Read the message shown, confirm the amount does not exceed the outstanding balance, and try once more. Do not repeatedly submit while a payment is marked pending.</td></tr>
<tr><td><b>Why can I not see a bill or ticket?</b></td><td>Clear search and filters, confirm you are signed into the correct account, and select Retry if the page could not load. Contact the administrator if the item belongs to another account.</td></tr>
</table>

<h2>Small Team Working Rules</h2>
<p class="footer-note">For a 5 to 20 person team, assign one finance owner to check payments, one maintenance coordinator to review AI priority and dispatch work, and one backup administrator. Use the ticket number or payment reference when discussing an issue, and mark notifications read only after someone has acted.</p>
</body>
</html>
'@

[System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.UTF8Encoding]::new($false))

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($htmlPath)
    $doc.BuiltInDocumentProperties('Title').Value = 'SiraNaBa User Manual'
    $doc.BuiltInDocumentProperties('Subject').Value = 'End-user documentation for a small team'
    $doc.BuiltInDocumentProperties('Author').Value = 'SiraNaBa Project'

    foreach ($section in $doc.Sections) {
        $section.PageSetup.PaperSize = 2
        $section.PageSetup.TopMargin = $word.InchesToPoints(0.48)
        $section.PageSetup.BottomMargin = $word.InchesToPoints(0.48)
        $section.PageSetup.LeftMargin = $word.InchesToPoints(0.58)
        $section.PageSetup.RightMargin = $word.InchesToPoints(0.58)
        $footer = $section.Footers.Item(1).Range
        $footer.Text = 'SiraNaBa User Manual   |   '
        $footer.ParagraphFormat.Alignment = 2
        $footer.Font.Name = 'Aptos'
        $footer.Font.Size = 8
        $footer.Font.Color = 5395026
        $footer.Collapse(0)
        [void]$footer.Fields.Add($footer, 33)
    }

    $doc.SaveAs2($docxPath, 16)
    $doc.ExportAsFixedFormat($pdfPath, 17)
    $doc.Close(0)
} finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
}

Write-Output $docxPath
Write-Output $pdfPath
