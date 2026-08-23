<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 0; }
        body { font-family: {{ $theme['font'] }}; color: {{ $theme['text'] }}; margin: 0; }

        .cover, .back-cover {
            position: relative;
            text-align: center;
            padding-top: {{ $coverPaddingTopPx }}px;
            box-sizing: border-box;
        }
        .cover { page-break-after: always; }
        .back-cover { page-break-before: always; }
        /*
         * Le fond couvre la page entière via un calque en position absolue
         * plutôt qu'en donnant sa hauteur réelle à .cover/.back-cover
         * directement : dompdf insère sinon une page blanche fantôme dès
         * qu'un élément avec page-break-after/-before atteint la hauteur
         * réelle de la page (constaté empiriquement). Un calque en position
         * absolue est retiré du flux normal et n'influence donc pas la
         * pagination, tout en couvrant visuellement toute la page.
         */
        .cover-bg {
            position: absolute;
            top: 0;
            left: 0;
            width: {{ $pageWidthPx }}px;
            height: {{ $pageHeightPx }}px;
            background: {{ $theme['background'] }};
            border: {{ $theme['border'] }};
            box-sizing: border-box;
            z-index: -1;
            @if ($coverImageDataUri)
                background-image: url({{ $coverImageDataUri }});
                background-size: cover;
                background-position: center;
            @endif
        }
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
        <div class="cover-bg">
            @if ($theme['ornament'])
                <span class="corner corner-tl">{{ $theme['ornament'] }}</span>
                <span class="corner corner-tr">{{ $theme['ornament'] }}</span>
                <span class="corner corner-bl">{{ $theme['ornament'] }}</span>
                <span class="corner corner-br">{{ $theme['ornament'] }}</span>
            @endif
        </div>
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
                @php
                    $h = fn ($px) => (int) round($px * $heightScale);
                @endphp
                @switch($page['layout_type'])
                    @case('solo')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '100%', 'height' => $h(820)])
                        </tr>
                        @break

                    @case('duo_vertical')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '50%', 'height' => $h(750)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '50%', 'height' => $h(750)])
                        </tr>
                        @break

                    @case('duo_horizontal')
                        <tr>@include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '100%', 'height' => $h(380)])</tr>
                        <tr>@include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '100%', 'height' => $h(380)])</tr>
                        @break

                    @case('trio_hero_left')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '50%', 'height' => $h(760), 'rowspan' => 2])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '50%', 'height' => $h(372)])
                        </tr>
                        <tr>@include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '50%', 'height' => $h(372)])</tr>
                        @break

                    @case('trio_hero_top')
                        <tr>@include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '100%', 'height' => $h(460), 'colspan' => 2])</tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '50%', 'height' => $h(300)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '50%', 'height' => $h(300)])
                        </tr>
                        @break

                    @case('strip_three')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '33%', 'height' => $h(480)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '34%', 'height' => $h(480)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '33%', 'height' => $h(480)])
                        </tr>
                        @break

                    @case('quad_grid')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '50%', 'height' => $h(372)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '50%', 'height' => $h(372)])
                        </tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '50%', 'height' => $h(372)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][3], 'width' => '50%', 'height' => $h(372)])
                        </tr>
                        @break

                    @case('quad_hero')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '60%', 'height' => $h(760), 'rowspan' => 3])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '40%', 'height' => $h(240)])
                        </tr>
                        <tr>@include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '40%', 'height' => $h(240)])</tr>
                        <tr>@include('partials.book-photo-cell', ['photo' => $page['photos'][3], 'width' => '40%', 'height' => $h(240)])</tr>
                        @break

                    @case('strip_four')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '25%', 'height' => $h(380)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '25%', 'height' => $h(380)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '25%', 'height' => $h(380)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][3], 'width' => '25%', 'height' => $h(380)])
                        </tr>
                        @break

                    @case('quintet_mosaic')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '55%', 'height' => $h(760), 'rowspan' => 2])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '22.5%', 'height' => $h(372)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '22.5%', 'height' => $h(372)])
                        </tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][3], 'width' => '22.5%', 'height' => $h(372)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][4], 'width' => '22.5%', 'height' => $h(372)])
                        </tr>
                        @break

                    @case('quintet_strip_top')
                        <tr>@include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '100%', 'height' => $h(420), 'colspan' => 4])</tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '25%', 'height' => $h(280)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '25%', 'height' => $h(280)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][3], 'width' => '25%', 'height' => $h(280)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][4], 'width' => '25%', 'height' => $h(280)])
                        </tr>
                        @break

                    @case('sextet_grid')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '33%', 'height' => $h(372)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '34%', 'height' => $h(372)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '33%', 'height' => $h(372)])
                        </tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][3], 'width' => '33%', 'height' => $h(372)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][4], 'width' => '34%', 'height' => $h(372)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][5], 'width' => '33%', 'height' => $h(372)])
                        </tr>
                        @break

                    @case('sextet_hero_grid')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '66%', 'height' => $h(500), 'rowspan' => 2, 'colspan' => 2])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '33%', 'height' => $h(245)])
                        </tr>
                        <tr>@include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '33%', 'height' => $h(245)])</tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][3], 'width' => '33%', 'height' => $h(250)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][4], 'width' => '34%', 'height' => $h(250)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][5], 'width' => '33%', 'height' => $h(250)])
                        </tr>
                        @break

                    @case('septet_mosaic')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '34%', 'height' => $h(760), 'rowspan' => 3])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '33%', 'height' => $h(240)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '33%', 'height' => $h(240)])
                        </tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][3], 'width' => '33%', 'height' => $h(240)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][4], 'width' => '33%', 'height' => $h(240)])
                        </tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][5], 'width' => '33%', 'height' => $h(240)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][6], 'width' => '33%', 'height' => $h(240)])
                        </tr>
                        @break

                    @case('septet_hero_top')
                        <tr>@include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '100%', 'height' => $h(380), 'colspan' => 3])</tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '33%', 'height' => $h(260)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '34%', 'height' => $h(260)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][3], 'width' => '33%', 'height' => $h(260)])
                        </tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][4], 'width' => '33%', 'height' => $h(260)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][5], 'width' => '34%', 'height' => $h(260)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][6], 'width' => '33%', 'height' => $h(260)])
                        </tr>
                        @break

                    @case('octet_grid')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '25%', 'height' => $h(280)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '25%', 'height' => $h(280)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '25%', 'height' => $h(280)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][3], 'width' => '25%', 'height' => $h(280)])
                        </tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][4], 'width' => '25%', 'height' => $h(280)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][5], 'width' => '25%', 'height' => $h(280)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][6], 'width' => '25%', 'height' => $h(280)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][7], 'width' => '25%', 'height' => $h(280)])
                        </tr>
                        @break

                    @case('octet_banner_grid')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '66%', 'height' => $h(280), 'colspan' => 2])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '33%', 'height' => $h(280)])
                        </tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '33%', 'height' => $h(220)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][3], 'width' => '34%', 'height' => $h(220)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][4], 'width' => '33%', 'height' => $h(220)])
                        </tr>
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][5], 'width' => '33%', 'height' => $h(220)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][6], 'width' => '34%', 'height' => $h(220)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][7], 'width' => '33%', 'height' => $h(220)])
                        </tr>
                        @break

                    @case('octet_filmstrip')
                        <tr>
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][0], 'width' => '12.5%', 'height' => $h(320)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][1], 'width' => '12.5%', 'height' => $h(320)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][2], 'width' => '12.5%', 'height' => $h(320)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][3], 'width' => '12.5%', 'height' => $h(320)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][4], 'width' => '12.5%', 'height' => $h(320)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][5], 'width' => '12.5%', 'height' => $h(320)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][6], 'width' => '12.5%', 'height' => $h(320)])
                            @include('partials.book-photo-cell', ['photo' => $page['photos'][7], 'width' => '12.5%', 'height' => $h(320)])
                        </tr>
                        @break

                    @default
                        @foreach ($page['photos']->chunk(2) as $row)
                            <tr>
                                @foreach ($row as $photo)
                                    @include('partials.book-photo-cell', ['photo' => $photo, 'width' => '50%', 'height' => $h(250)])
                                @endforeach
                            </tr>
                        @endforeach
                @endswitch
            </table>
            <p class="page-number">Page {{ $page['page_number'] }}</p>
        </div>
    @endforeach

    <div class="back-cover">
        <div class="cover-bg">
            @if ($theme['ornament'])
                <span class="corner corner-tl">{{ $theme['ornament'] }}</span>
                <span class="corner corner-tr">{{ $theme['ornament'] }}</span>
                <span class="corner corner-bl">{{ $theme['ornament'] }}</span>
                <span class="corner corner-br">{{ $theme['ornament'] }}</span>
            @endif
        </div>
        <div class="cover-panel">
            <p class="mark">* * *</p>
            <p>{{ $family->name }} — {{ $pages->count() }} page{{ $pages->count() > 1 ? 's' : '' }} de souvenirs</p>
            <p class="credit">Créé avec Souvenirs Famille — par Dramane Tanou</p>
        </div>
    </div>
</body>
</html>
