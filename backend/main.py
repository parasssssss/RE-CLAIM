from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from routes import auth_routes, item_routes, profile_routes, match_routes, admin_routes, onboarding_routes,user_routes,notification_routes,staff_routes,billing_routes,customer_routes
from fastapi.middleware.cors import CORSMiddleware

app=FastAPI(title="RE-CLAIM API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(profile_routes.router) 
app.include_router(match_routes.router)
app.include_router(admin_routes.router)
app.include_router(onboarding_routes.router)
app.include_router(item_routes.router)
app.include_router(user_routes.router)
app.include_router(notification_routes.router)
app.include_router(staff_routes.router)
app.include_router(billing_routes.router)
app.include_router(customer_routes.router)

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")