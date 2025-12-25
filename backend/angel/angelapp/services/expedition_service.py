from django.db import transaction



from angelapp.services.stock_issue_service import StockIssueService
class ExpeditionService:

    @staticmethod
    def close_expedition(expedition):
        with transaction.atomic():
            expedition.close()
            StockIssueService.create_from_expedition(expedition)
