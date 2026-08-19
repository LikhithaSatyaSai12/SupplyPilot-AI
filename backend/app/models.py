from sqlalchemy import Column, Integer, Float, String

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


# --------------------------------------------------
# Execution Outcomes
# --------------------------------------------------

class ExecutionOutcome(Base):
    __tablename__ = "execution_outcomes"

    id = Column(Integer, primary_key=True, index=True)

    executed_decision_id = Column(
        Integer,
        nullable=False,
        index=True
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