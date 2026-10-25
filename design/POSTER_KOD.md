# Афиша «Культурный код»

Формат: A3, 297 × 420 мм. Белый фон, Montserrat Medium, 15 скруглённых фотосекций образуют слово «КОД». Фотографии подлинные цветные: Прокудин-Горский, начало XX века. Источники и лицензии перечислены в source/cover-history-sources.json. В этой компоновке изображения не генерировались и не раскрашивались; JPEG-сжатие применяется только при экспорте. Оригиналы assets/cover-history сохранены.

Текст: «Исторический квиз», «КУЛЬТУРНЫЙ», «КОД», «2 ноября 18:30», «„Вектор“, ул. Фрунзе, 60» (в самой афише используются кавычки «Вектор»).

- cultural-code-poster-kod.svg — самостоятельный мастер: встроенные фото, текст в кривых. Открывается без установки Montserrat.
- cultural-code-poster-kod.png — 2480 × 3507 px, публикация.
- cultural-code-poster-kod-A3.pdf — одностраничный PDF для печати, буквы и маски векторные, фотографии встроены.

Пересборка SVG: `python3 scripts/build-poster.py`. Для PNG: `inkscape design/cultural-code-poster-kod.svg --export-type=png --export-filename=design/cultural-code-poster-kod.png --export-width=2480`. Для PDF: экспорт из Inkscape; окончательный PDF оптимизирован Ghostscript с JPEG 92 без уменьшения разрешения фотографий.

Шрифт: локальный Montserrat Medium 500, OFL 1.1; источник source/montserrat-font-source.json. Предыдущая афиша cultural-code-poster-4x3.png сохранена.
