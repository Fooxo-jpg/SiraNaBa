$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'deliverables\SiraNaBa_User_Manual_Small_Team.docx'
$work = Join-Path $root 'tools\manual_word\patch'
$zip = Join-Path $root 'tools\manual_word\manual.zip'
$outputZip = Join-Path $root 'tools\manual_word\manual_updated.zip'
$outputDocx = Join-Path $root 'tools\manual_word\SiraNaBa_User_Manual_Small_Team.updated.docx'

if (Test-Path $work) { Remove-Item -LiteralPath $work -Recurse -Force }
Copy-Item -LiteralPath $source -Destination $zip -Force
Expand-Archive -LiteralPath $zip -DestinationPath $work -Force

$xmlPath = Join-Path $work 'word\document.xml'
[xml]$xml = Get-Content -Raw $xmlPath
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
$paragraphs = $xml.SelectNodes('//w:body//w:p', $ns)

$replacement = @{
  0 = 'SiraNaBa User Manual'
  1 = 'End user guide for a small team of 5 to 20 users'
  2 = 'SiraNaBa is a web-based facility portal for tenants and property staff. It brings finance management, maintenance tickets with AI-assisted triage, and service notifications into one place. This guide covers the everyday tasks most users need.'
  6 = '3  Use the menu  Tenants use Dashboard, Maintenance, Billing, and Notifications. Property staff also use the administration area to manage tenants, payments, and ticket dispatch.'
  7 = 'Three Main Features'
  8 = '1  Finance Management  Open Billing to review rent and utility balances, itemised statements, due dates, payment history, and receipt references.'
  9 = '2  Maintenance Tickets and AI Triage  Submit the problem, location, severity information, and optional photos. The system checks urgency and suggests a priority for staff review.'
  10 = '3  Notifications  See payment reminders, ticket progress, scheduled work, and facility notices. Opening an alert takes you to the related item.'
  11 = '4  Small Team Roles  Assign one person to check finance, one to coordinate maintenance, and one backup administrator. Staff remain responsible for final decisions.'
  13 = 'Wireframe of notification settings in the SiraNaBa portal'
  14 = 'What Happens When You Act'
  16 = 'Event'
  17 = 'Action'
  18 = 'You select Pay Now and confirm'
  19 = 'The system validates the amount, updates the balance and Payment History, then shows a receipt or failure message.'
  20 = 'You submit a maintenance request'
  21 = 'The request receives a ticket number. AI triage checks the details and suggests a priority for staff review.'
  22 = 'A staff member assigns or updates a ticket'
  23 = 'The ticket timeline changes and a Maintenance notification appears for the tenant.'
  24 = 'A bill, due date, or payment changes'
  25 = 'A Payments notification shows the new information and links to Billing.'
  26 = 'You select a notification'
  27 = 'The related bill, ticket, or notice opens and the notification is marked as read.'
  29 = 'Quick How To'
  30 = '1  Make a payment  Open Billing, check Total Outstanding, select Pay Now, choose Rent, Utilities, or Both, enter the amount, and confirm.'
  31 = '2  Save the result  Keep the receipt reference. If the screen says Simulated, no real funds were transferred.'
  32 = '3  Submit a ticket  Open Maintenance, select Submit Maintenance Request, complete Details, Location, Severity, and Review, then submit.'
  33 = '4  Follow progress  Open Maintenance or Notifications to see assignment and repair updates. Mark alerts read after the team has acted.'
  34 = 'Important: AI triage assists with urgency. Property staff review the priority and decide who is assigned.'
  35 = 'Ticket Reporting and AI Triage'
  36 = 'Give clear information so the system and your maintenance coordinator can understand the problem quickly.'
  37 = '1  Describe the issue  Choose the closest category and enter a short, specific title.'
  38 = '2  Add the location  Select the building area and unit or work area where the problem is happening.'
  39 = '3  Explain the risk  Describe what happened, when it started, and whether anyone or any property is in immediate danger.'
  40 = '4  Review and submit  Add a clear photo when useful, check the details, select Submit Request, and keep the ticket number.'
  42 = 'Wireframe of the SiraNaBa maintenance request form'
  43 = 'Troubleshooting and Frequently Asked Questions'
  46 = 'Why did my event not trigger?'
  47 = 'Refresh and wait briefly. Confirm the payment or ticket was successfully submitted, then check Notifications and its filters. Report the time and ticket or receipt reference if it is still missing.'
  50 = 'Why can I not see a bill or ticket?'
  51 = 'Clear search and filters, confirm you are signed into the correct account, and select Retry if the page could not load. Ask the administrator if the item belongs to another account.'
  52 = 'Why did a payment fail?'
  53 = 'Read the message, confirm the amount does not exceed the outstanding balance, and try once more. Do not submit again while the payment is marked pending.'
  54 = 'Why is ticket priority still loading?'
  55 = 'The triage check may still be running or may need more information. Refresh Maintenance. Staff can review and update the priority if needed.'
  56 = 'Small Team Working Rules'
  57 = 'Assign one finance owner to check payments, one maintenance coordinator to review AI priority and dispatch work, and one backup administrator. Use the ticket number or payment reference when discussing an issue, and mark notifications read only after someone has acted.'
}

foreach ($index in $replacement.Keys) {
    $nodes = $paragraphs[$index].SelectNodes('.//w:t', $ns)
    if ($nodes.Count -eq 0) { continue }
    $nodes[0].InnerText = $replacement[$index]
    for ($i = 1; $i -lt $nodes.Count; $i++) { $nodes[$i].InnerText = '' }
}

$settings = New-Object System.Xml.XmlWriterSettings
$settings.Encoding = New-Object System.Text.UTF8Encoding($false)
$settings.Indent = $false
$writer = [System.Xml.XmlWriter]::Create($xmlPath, $settings)
$xml.Save($writer)
$writer.Close()

if (Test-Path $outputZip) { Remove-Item -LiteralPath $outputZip -Force }
Compress-Archive -Path (Join-Path $work '*') -DestinationPath $outputZip -CompressionLevel Optimal
Copy-Item -LiteralPath $outputZip -Destination $outputDocx -Force
Copy-Item -LiteralPath $outputDocx -Destination $source -Force
Write-Output $source
