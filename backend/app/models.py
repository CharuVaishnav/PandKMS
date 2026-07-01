from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    salt = Column(String, nullable=False)  # base64 salt for master key derivation
    totp_secret = Column(String, nullable=True)
    totp_enabled = Column(Boolean, default=False)
    email_otp_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    hosting_accounts = relationship("HostingAccount", back_populates="owner", cascade="all, delete-orphan")
    git_repos = relationship("GitRepo", back_populates="owner", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    # Wrapped data key (JSON with ciphertext/iv/tag) encrypted with user's master key
    wrapped_data_key = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="projects")
    secrets = relationship("Secret", back_populates="project", cascade="all, delete-orphan")
    key_values = relationship("KeyValue", back_populates="project", cascade="all, delete-orphan")


class Secret(Base):
    __tablename__ = "secrets"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    value_enc = Column(Text, nullable=False)
    iv = Column(String, nullable=False)
    tag = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="secrets")


class KeyValue(Base):
    __tablename__ = "key_values"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    key = Column(String, nullable=False)
    value = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="key_values")


class HostingAccount(Base):
    __tablename__ = "hosting_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    provider = Column(String, nullable=False)  # vercel, netlify, railway, etc.
    token_enc = Column(Text, nullable=True)
    token_iv = Column(String, nullable=True)
    token_tag = Column(String, nullable=True)
    wrapped_data_key = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="hosting_accounts")

    @property
    def has_token(self) -> bool:
        return self.token_enc is not None


class EmailOTP(Base):
    __tablename__ = "email_otps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    code_hash = Column(String, nullable=False)
    purpose = Column(String, nullable=False)  # "enable", "disable", or "login"
    consumed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)


class GitRepo(Base):
    __tablename__ = "git_repos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    url = Column(String, nullable=True)
    provider = Column(String, default="github")
    token_enc = Column(Text, nullable=True)
    token_iv = Column(String, nullable=True)
    token_tag = Column(String, nullable=True)
    wrapped_data_key = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="git_repos")

    @property
    def has_token(self) -> bool:
        return self.token_enc is not None
