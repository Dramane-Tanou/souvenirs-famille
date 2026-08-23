<td
    @if(!empty($colspan)) colspan="{{ $colspan }}" @endif
    @if(!empty($rowspan)) rowspan="{{ $rowspan }}" @endif
    style="width: {{ $width ?? '50%' }};"
>
    @if ($photo['data_uri'] ?? null)
        <img src="{{ $photo['data_uri'] }}" alt="" style="height: {{ $height ?? 250 }}px;">
    @endif
    @if (($photo['caption'] ?? null) || ($photo['date'] ?? null))
        <p class="caption">
            {{ $photo['caption'] ?? '' }}{{ ($photo['caption'] ?? null) && ($photo['date'] ?? null) ? ' — ' : '' }}{{ $photo['date'] ?? '' }}
        </p>
    @endif
</td>
