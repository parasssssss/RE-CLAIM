from sqlalchemy import Column, Float, Integer, String, ForeignKey, DateTime,Text,ForeignKey, Date, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Role(Base):
    __tablename__ = "roles"
    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String, unique=True, nullable=False)
    description = Column(String)

class Business(Base):
    __tablename__ = "businesses"
    business_id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String, nullable=False)
    address = Column(String)
    contact_email = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    Business=relationship("Item", back_populates="business")

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.business_id"))
    role_id = Column(Integer, ForeignKey("roles.role_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    items = relationship("Item", back_populates="user")

class UserProfile(Base):
    __tablename__ = "user_profile"

    profile_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    profile_image = Column(Text, nullable=True)          # encrypted + base64
    profile_image_mime = Column(String(100), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="profile")


class Item(Base):
    __tablename__ = "items"

    item_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"))
    business_id = Column(Integer, ForeignKey("businesses.business_id", ondelete="CASCADE"))

    item_type = Column(String(100), nullable=False)
    brand = Column(String(100))
    color = Column(String(50))
    description = Column(Text)

    image_path = Column(Text, nullable=True)
    image_mime = Column(String(50), nullable=True)

    status = Column(String(30), nullable=False, default="LOST")
    ai_match_score = Column(Float)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    lost_location = Column(String(255), nullable=True)
    user = relationship("User", back_populates="items")
    business = relationship("Business")


class BusinessRegistration(Base):
    __tablename__ = "business_registrations"

    id = Column(Integer, primary_key=True)
    registration_token = Column(String, unique=True, index=True)

    business_name = Column(String)
    address = Column(String)
    contact_email = Column(String)

    admin_name = Column(String)
    admin_email = Column(String)
    admin_password_hash = Column(String)

    status = Column(String, default="PENDING")  
    # PENDING | PAID | COMPLETED | EXPIRED

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(Integer, primary_key=True)
    registration_token = Column(String, index=True)
    razorpay_order_id = Column(String)
    razorpay_payment_id = Column(String)
    amount = Column(Integer)
    status = Column(String)  # CREATED | PAID | FAILED
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Match(Base):
    __tablename__ = "matches"

    match_id = Column(Integer, primary_key=True, index=True)
    lost_item_id = Column(Integer, ForeignKey("items.item_id"))
    found_item_id = Column(Integer, ForeignKey("items.item_id"))
    similarity_score = Column(Float)
    status = Column(String(30), default="PENDING")  # PENDING | ADMIN_REVIEW | RESOLVED | REJECTED
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


