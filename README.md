Application made with frontend in (React JS + Vite) + backend in (FastAPI(Python)).

Steps for running the project locally:
1. git clone https://github.com/sudipsudip001/Nidan-Vitals.git

2. For frontend:
	2.1. Navigate to the frontend repository:
		`cd frontend`

	2.2. Install node packages:
		`npm install`

	2.3. Start the application and click on the given URL:
		`npm run dev`
		Click on `http://localhost:5173/`

3. For backend:
	3.1. Navigate to the backend repository:
		`cd backend`
	
	3.2. Sync the uv packages:
		`uv sync`

	3.3. Create the database, user and set password for Postgres database in your system:
		`python create_db.py`
	
	3.4. Run the server:
		`uvicorn main:app --reload`

(NOTE: The application requires Postgresql installed in your system.)

The demonstration link is given here: (https://youtu.be/-8Q9zMUZMfw)
