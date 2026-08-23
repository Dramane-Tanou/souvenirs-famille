<td
    @if(!empty($colspan)) colspan="{{ $colspan }}" @endif
    @if(!empty($rowspan)) rowspan="{{ $rowspan }}" @endif
    style="width: {{ $width ?? '50%' }};{{ !empty($padding) ? ' padding: ' . $padding . ';' : '' }}"
>
    @if ($photo['data_uri'] ?? null)
        {{-- L'image est déjà recadrée côté serveur (BookController::cropToAspectAndEncode)
             avant d'être encodée en base64 : dompdf n'applique pas object-fit/object-position,
             donc le recadrage ne peut pas se faire en CSS ici. --}}
        <img src="{{ $photo['data_uri'] }}" alt="" style="height: {{ $height ?? 250 }}px;">
    @endif
    @if (($photo['caption'] ?? null) || ($photo['date'] ?? null))
        <p class="caption">
            {{ $photo['caption'] ?? '' }}{{ ($photo['caption'] ?? null) && ($photo['date'] ?? null) ? ' — ' : '' }}{{ $photo['date'] ?? '' }}
        </p>
    @endif
</td>
