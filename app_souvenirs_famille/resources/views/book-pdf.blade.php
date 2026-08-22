<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: {{ $theme['font'] }}; color: {{ $theme['text'] }}; margin: 0; }

        .cover, .back-cover {
            text-align: center;
            padding-top: 260px;
            padding-bottom: 260px;
            background: {{ $theme['background'] }};
            border: {{ $theme['border'] }};
            box-sizing: border-box;
        }
        .cover { page-break-after: always; }
        .back-cover { page-break-before: always; }
        .cover h1 { font-size: 30px; color: {{ $theme['accent'] }}; margin-bottom: 10px; }
        .cover p, .back-cover p { font-size: 14px; color: {{ $theme['text'] }}; }
        .back-cover .mark { font-size: 22px; color: {{ $theme['accent'] }}; margin-bottom: 14px; letter-spacing: 4px; }

        .page {
            padding: 16px;
            background: {{ $theme['background'] }};
            box-sizing: border-box;
        }
        .page + .page { page-break-before: always; }

        .grid { width: 100%; border-collapse: collapse; }
        .grid td { width: 50%; padding: 6px; vertical-align: top; }
        .grid img {
            width: 100%;
            height: 250px;
            object-fit: cover;
            border-radius: {{ $theme['photo_radius'] }};
            border: 1px solid {{ $theme['accent'] }};
        }
        .caption { font-size: 10px; color: {{ $theme['text'] }}; text-align: center; margin-top: 3px; font-style: italic; }
        .page-number { text-align: center; font-size: 11px; color: {{ $theme['accent'] }}; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="cover">
        <h1>{{ $family->name }}</h1>
        <p>Livre photo — {{ \Carbon\Carbon::parse($book->period_start)->locale('fr')->translatedFormat('F Y') }}</p>
    </div>

    @foreach ($pages as $page)
        <div class="page">
            <table class="grid">
                @foreach ($page['photos']->chunk(2) as $row)
                    <tr>
                        @foreach ($row as $photo)
                            <td>
                                @if ($photo['data_uri'])
                                    <img src="{{ $photo['data_uri'] }}" alt="">
                                @endif
                                @if ($photo['caption'])
                                    <p class="caption">{{ $photo['caption'] }}</p>
                                @endif
                            </td>
                        @endforeach
                    </tr>
                @endforeach
            </table>
            <p class="page-number">Page {{ $page['page_number'] }}</p>
        </div>
    @endforeach

    <div class="back-cover">
        <p class="mark">* * *</p>
        <p>{{ $family->name }} — {{ $pages->count() }} page{{ $pages->count() > 1 ? 's' : '' }} de souvenirs</p>
        <p>Créé avec Souvenirs Famille</p>
    </div>
</body>
</html>
