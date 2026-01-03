from django.db import transaction
from django.db.models import Max
from django.utils import timezone


from angelapp.models import Expedition
from angelapp.services.stock_issue_service import StockIssueService
class ExpeditionService:

    @staticmethod
    def close_expedition(expedition):
        with transaction.atomic():
            expedition.close()
            StockIssueService.create_from_expedition(expedition)

    @staticmethod
    def generate_expedition_number():
        """
        Generuje číslo vo formáte: 2026EX0001
        """
        year = timezone.now().year
        prefix = f"{year}EX"
        
        # Nájdeme posledné použité číslo pre tento rok
        last_expedition = Expedition.objects.filter(
            expedition_number__startswith=prefix
        ).aggregate(max_num=Max("expedition_number"))["max_num"]

        if not last_expedition:
            next_num = 1
        else:
            # Odrežeme prefix "2026EX" a pripočítame 1
            try:
                last_num_part = int(last_expedition[len(prefix):])
                next_num = last_num_part + 1
            except (ValueError, TypeError):
                next_num = 1

        return f"{prefix}{str(next_num).zfill(4)}"