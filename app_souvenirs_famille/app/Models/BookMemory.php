<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['book_id', 'book_page_id', 'memory_id', 'position'])]
class BookMemory extends Model
{
    protected $table = 'book_memory';

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(BookPage::class, 'book_page_id');
    }

    public function memory(): BelongsTo
    {
        return $this->belongsTo(Memory::class);
    }
}