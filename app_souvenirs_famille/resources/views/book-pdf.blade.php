<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: {{ $theme['font'] }}; color: {{ $theme['text'] }}; margin: 0; }

        .cover, .back-cover {
            position: relative;
            text-align: center;
            padding-top: 260px;
            padding-bottom: 260px;
            background: {{ $theme['background'] }};
            border: {{ $theme['border'] }};
            box-sizing: border-box;
            @if ($coverImageDataUri)
                background-image: url({{ $coverImageDataUri }});
                background-size: cover;
                background-position: center;
            @endif
        }
        .cover { page-break-after: always; }
        .back-cover { page-break-before: always; }
        .cover h1 { font-size: 30px; color: {{ $theme['accent'] }}; margin-bottom: 10px; }
        .cover p, .back-cover p { font-size: 14px; color: {{ $theme['text'] }}; }
        .back-cover .mark { font-size: 22px; color: {{ $theme['accent'] }}; margin-bottom: 14px; letter-spacing: 4px; }
        .corner { position: absolute; font-size: 22px; color: {{ $theme['accent'] }}; }
        .corner-tl { top: 24px; left: 24px; }
        .corner-tr { top: 24px; right: 24px; }
        .corner-bl { bottom: 24px; left: 24px; }
        .corner-br { bottom: 24px; right: 24px; }
        .cover-panel {
            @if ($coverImageDataUri)
                display: inline-block;
                background: rgba(255,255,255,0.88);
                padding: 22px 34px;
                border-radius: 6px;
            @endif
        }
        .dedication {
            margin: 20px 60px 0;
            font-size: 15px;
            color: {{ $theme['text'] }};
            @if ($dedicationFont)
                font-family: {{ $dedicationFont['font_family'] }};
                font-style: {{ $dedicationFont['font_style'] }};
            @endif
        }
        .credit { font-size: 11px; color: {{ $theme['accent'] }}; margin-top: 18px; }

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
        @if ($theme['ornament'])
            <span class="corner corner-tl">{{ $theme['ornament'] }}</span>
            <span class="corner corner-tr">{{ $theme['ornament'] }}</span>
            <span class="corner corner-bl">{{ $theme['ornament'] }}</span>
            <span class="corner corner-br">{{ $theme['ornament'] }}</span>
        @endif
        <div class="cover-panel">
            <h1>{{ $family->name }}</h1>
            <p>Livre photo — {{ \Carbon\Carbon::parse($book->period_start)->locale('fr')->translatedFormat('F Y') }}</p>
            @if ($book->dedication_message)
                <p class="dedication">{{ $book->dedication_message }}</p>
            @endif
        </div>
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
        @if ($theme['ornament'])
            <span class="corner corner-tl">{{ $theme['ornament'] }}</span>
            <span class="corner corner-tr">{{ $theme['ornament'] }}</span>
            <span class="corner corner-bl">{{ $theme['ornament'] }}</span>
            <span class="corner corner-br">{{ $theme['ornament'] }}</span>
        @endif
        <div class="cover-panel">
            <p class="mark">* * *</p>
            @if ($book->dedication_message)
                <p class="dedication">{{ $book->dedication_message }}</p>
            @endif
            <p>{{ $family->name }} — {{ $pages->count() }} page{{ $pages->count() > 1 ? 's' : '' }} de souvenirs</p>
            <p class="credit">Créé avec Souvenirs Famille — par Dramane Tanou</p>
        </div>
    </div>
</body>
</html>
