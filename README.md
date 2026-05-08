# Driver Route Viewer

Mobile-first React app for daily Menorca collection routes.

## Driver flow

1. Open the app.
2. Select a `driver / truck` assignment.
3. View only the stops assigned to that route.
4. Track completed and pending stops.
5. Open the route in Google Maps.

## Admin / demo mode

The first screen also includes a CSV upload panel for office or demo use.

Expected CSV columns:

```csv
driver,truck,name,address,city,notes
Joan,Truck 1,Hotel Xuroy,Carrer Llevant 2,Alcalfar,Organic waste
Joan,Truck 1,Restaurant Sa Llagosta,Carrer des Port 10,Fornells,Glass pickup
Pere,Truck 2,Hotel Cala Galdana,Avinguda Cala Galdana,Cala Galdana,Plastic containers
Pere,Truck 2,Supermercat Ferreries,Carrer Major 44,Ferreries,Cardboard pickup
```

## Run

```bash
npm install
npm run dev
```
