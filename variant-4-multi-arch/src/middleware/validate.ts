import { Request, Response, NextFunction } from "express";

interface DTO {
  validate(): string | null;
}

interface DTOConstructor {
  new (body: Record<string, unknown>): DTO;
}

export function validate(DTOClass: DTOConstructor) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dto = new DTOClass(req.body);
    const error = dto.validate();
    if (error) {
      res.status(400).json({ error });
      return;
    }
    (req as any).dto = dto;
    next();
  };
}
