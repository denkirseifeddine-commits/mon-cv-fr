{!! 'Nouvelle demande de devis reçue depuis le site Digital Solution Studio.' !!}

@foreach ($rows as $label => $value)
{!! $label !!} : {!! $value !!}
@endforeach

Message :
{!! $quote->message !!}

—
Répondez directement à cet e-mail pour écrire au visiteur.
La demande est enregistrée dans le backoffice sous la référence {!! $quote->reference !!}.
