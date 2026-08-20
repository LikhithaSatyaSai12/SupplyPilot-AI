from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


# --------------------------------------------------
# Decision History
# --------------------------------------------------

class DecisionHistory(Base):
    __tablename__ = "decision_history"

    id = Column(Integer, primary_key=True, index=True)

    supplier = Column(String, nullable=False)

    quantity = Column(Float, nullable=False)

    risk = Column(String, nullable=False)

    recommendation = Column(String, nullable=False)

    timestamp = Column(String, nullable=False)


# --------------------------------------------------
# Executed Decisions
# --------------------------------------------------

class ExecutedDecision(Base):
    __tablename__ = "executed_decisions"

    id = Column(Integer, primary_key=True, index=True)

    supplier = Column(String, nullable=False)

    quantity = Column(Float, nullable=False)

    risk = Column(String, nullable=False)

    action_id = Column(String, nullable=False)

    action = Column(String, nullable=False)

    description = Column(String, nullable=False)

    expected_cost = Column(Float, nullable=False)

    expected_days = Column(Integer, nullable=False)

    expected_risk = Column(String, nullable=False)

    executed_at = Column(String, nullable=False)

    # 1-to-(0..1) Relationship to ExecutionOutcome
    outcome = relationship(
        "ExecutionOutcome",
        uselist=False,
        back_populates="executed_decision",
        cascade="all, delete-orphan",
    )


# --------------------------------------------------
# Execution Outcomes
# --------------------------------------------------

class ExecutionOutcome(Base):
    __tablename__ = "execution_outcomes"

    id = Column(Integer, primary_key=True, index=True)

    executed_decision_id = Column(
        Integer,
        ForeignKey("executed_decisions.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Parent relationship back to ExecutedDecision
    executed_decision = relationship(
        "ExecutedDecision",
        back_populates="outcome",
    )

    supplier = Column(
        String,
        nullable=False
    )

    quantity = Column(
        Float,
        nullable=False
    )

    action_id = Column(
        String,
        nullable=False
    )

    action = Column(
        String,
        nullable=False
    )

    expected_cost = Column(
        Float,
        nullable=False
    )

    actual_cost = Column(
        Float,
        nullable=False
    )

    expected_days = Column(
        Integer,
        nullable=False
    )

    actual_days = Column(
        Integer,
        nullable=False
    )

    expected_risk = Column(
        String,
        nullable=False
    )

    actual_risk = Column(
        String,
        nullable=False
    )

    cost_variance = Column(
        Float,
        nullable=False
    )

    delivery_variance = Column(
        Integer,
        nullable=False
    )

    outcome_status = Column(
        String,
        nullable=False
    )

    recorded_at = Column(
        String,
        nullable=False
    )


# --------------------------------------------------
# Model Retraining Log
# --------------------------------------------------

class ModelRetraining(Base):
    __tablename__ = "model_retraining"

    id = Column(Integer, primary_key=True, index=True)

    started_at = Column(String, nullable=False)

    completed_at = Column(String, nullable=True)

    status = Column(String, nullable=False)

    trigger_reason = Column(String, nullable=False)

    number_of_records = Column(Integer, nullable=False, default=0)

    model_version = Column(String, nullable=False)

    risk_accuracy = Column(Float, nullable=True)

    delay_mae = Column(Float, nullable=True)

    error_message = Column(String, nullable=True)