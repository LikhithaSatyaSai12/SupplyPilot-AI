from sqlalchemy import Column, Integer, Float, String

from app.database import Base


class DecisionHistory(Base):
    __tablename__ = "decision_history"

    id = Column(Integer, primary_key=True, index=True)

    supplier = Column(String, nullable=False)

    quantity = Column(Float, nullable=False)

    risk = Column(String, nullable=False)

    recommendation = Column(String, nullable=False)

    timestamp = Column(String, nullable=False)