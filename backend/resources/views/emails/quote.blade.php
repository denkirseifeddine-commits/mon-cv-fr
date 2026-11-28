<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Demande de devis {{ $quote->reference }}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;">
<p>Nouvelle demande de devis reçue depuis le site Digital Solution Studio.</p>
<table role="presentation" style="border-collapse:collapse;">
@foreach ($rows as $label => $value)
<tr><th scope="row" style="padding:6px 12px 6px 0;vertical-align:top;text-align:left;font-weight:600;">{{ $label }}</th><td style="padding:6px 12px 6px 0;vertical-align:top;">{{ $value }}</td></tr>
@endforeach
</table>
<p style="margin-top:20px;font-weight:600;">Message :</p>
<div style="white-space:pre-wrap;border-left:3px solid #c9a227;padding-left:12px;">{{ $quote->message }}</div>
<p style="margin-top:24px;color:#555;font-size:13px;">Répondez directement à cet e-mail pour écrire au visiteur. La demande est enregistrée dans le backoffice sous la référence {{ $quote->reference }}.</p>
</body>
</html>
