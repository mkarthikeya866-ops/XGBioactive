from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class CompoundBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=140, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    category: str = Field(min_length=2, max_length=80)
    source: str = Field(min_length=2, max_length=120)
    summary: str = Field(min_length=10, max_length=500)
    description: str = Field(min_length=10)
    molecular_formula: str | None = Field(default=None, max_length=80)
    molecular_weight: float | None = Field(default=None, gt=0)
    image_url: HttpUrl | None = None


class CompoundCreate(CompoundBase):
    pass


class CompoundUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    slug: str | None = Field(default=None, min_length=2, max_length=140, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    category: str | None = Field(default=None, min_length=2, max_length=80)
    source: str | None = Field(default=None, min_length=2, max_length=120)
    summary: str | None = Field(default=None, min_length=10, max_length=500)
    description: str | None = Field(default=None, min_length=10)
    molecular_formula: str | None = Field(default=None, max_length=80)
    molecular_weight: float | None = Field(default=None, gt=0)
    image_url: HttpUrl | None = None


class CompoundRead(CompoundBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class CategoryCount(BaseModel):
    category: str
    count: int
