import os
import django
import json

# Nastavenie Django prostredia
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "angel.settings")  # uprav podľa projektu
django.setup()

from angelapp.models import City, Company

# Cesta k JSON súboru
json_file = r"C:\Users\rasto\Downloads\obce.json"  # uprav podľa svojho súboru

with open(json_file, encoding="utf-8") as f:
    companies = json.load(f)

for item in companies:
    # Získanie / vytvorenie mesta
    postal_code = item.get("postal_code")
    city_name = item.get("city_name")
    
    city, created = City.objects.get_or_create(
        postal_code=postal_code,
        defaults={"name": city_name or "", "country": "Slovensko"}
    )

    # Získanie / vytvorenie doručovacieho mesta (ak je)
    delivery_city_name = item.get("delivery_city")
    delivery_city = None
    if delivery_city_name:
        delivery_city, _ = City.objects.get_or_create(
            postal_code=postal_code,  # predpokladáme rovnaké PSČ, uprav ak treba iné
            defaults={"name": delivery_city_name, "country": "Slovensko"}
        )

    # Vytvorenie firmy
    company, created = Company.objects.update_or_create(
        internet_id=item["internet_id"],
        defaults={
            "ico": item.get("ico"),
            "dic": item.get("dic"),
            "ic_dph": item.get("ic_dph"),
            "is_legal_entity": item.get("is_legal_entity", True),
            "name": item.get("name"),
            "address": item.get("address"),
            "city": city,
            "delivery_address": item.get("delivery_address"),
            "delivery_city": delivery_city,
            "phone": item.get("phone"),
            "email": item.get("email"),
            "website": item.get("website"),
        }
    )

print(f"Import dokončený, spracovaných {len(companies)} firiem")
