<?php
require_once __DIR__ . '/../core/Model.php';

class ExpenseCategoryModel extends Model {
    protected string $table = 'Expense_Categories';
    protected array $fillable = ['category_name'];
    protected array $searchable = ['category_name'];
}
