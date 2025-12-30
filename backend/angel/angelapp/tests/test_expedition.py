# tests/test_expedition.py
import pytest
from django.db import transaction
from angelapp.models import Expedition, StockIssue
from angelapp.tasks import create_stock_issue_from_expedition_task

@pytest.mark.django_db
def test_create_stock_issue_on_shipped_status():
    # Vytvoríme expedíciu
    expedition = Expedition.objects.create(status="draft")

    # Žiadny StockIssue zatiaľ
    assert expedition.stock_issue is None
    assert StockIssue.objects.count() == 0

    # Zmeníme status na "shipped"
    expedition.status = "shipped"
    expedition.save()  # tu sa spustí signál a task

    # Task sa spustí hneď v eager režime, takže môžeme rovno overiť
    expedition.refresh_from_db()
    assert expedition.stock_issue is not None
    assert StockIssue.objects.count() == 1
