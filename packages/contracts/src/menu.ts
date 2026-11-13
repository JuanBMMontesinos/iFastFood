/**
 * Contratos do cardápio (F2): categorias, produtos e complementos.
 * Escopo do parceiro (todas as rotas exigem membership via PartnerGuard).
 */
import { z } from 'zod';
import { moneyCentsSchema, nameSchema, uuidSchema } from './common';

export const menuCategoryInputSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    description: z.string().trim().max(200).optional(),
    position: z.number().int().min(0).max(999).optional(),
  })
  .strict();
export type MenuCategoryInput = z.infer<typeof menuCategoryInputSchema>;

export const menuCategoryUpdateSchema = menuCategoryInputSchema
  .extend({ active: z.boolean().optional() })
  .strict();
export type MenuCategoryUpdateInput = z.infer<typeof menuCategoryUpdateSchema>;

export const menuProductInputSchema = z
  .object({
    name: nameSchema,
    description: z.string().trim().max(500).optional(),
    basePriceCents: moneyCentsSchema,
    promotionalPriceCents: moneyCentsSchema.optional(),
    imageUrl: z.string().url().max(500).optional(),
    isFeatured: z.boolean().optional(),
    position: z.number().int().min(0).max(999).optional(),
  })
  .strict()
  .refine(
    (p) => p.promotionalPriceCents === undefined || p.promotionalPriceCents < p.basePriceCents,
    { message: 'Preço promocional deve ser MENOR que o preço base' },
  );
export type MenuProductInput = z.infer<typeof menuProductInputSchema>;

export const menuProductUpdateSchema = z
  .object({
    menuCategoryId: uuidSchema.optional(), // mover entre categorias
    name: nameSchema.optional(),
    description: z.string().trim().max(500).nullable().optional(),
    basePriceCents: moneyCentsSchema.optional(),
    promotionalPriceCents: moneyCentsSchema.nullable().optional(),
    imageUrl: z.string().url().max(500).nullable().optional(),
    active: z.boolean().optional(),
    paused: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    position: z.number().int().min(0).max(999).optional(),
  })
  .strict()
  .refine(
    (p) =>
      p.basePriceCents === undefined ||
      p.promotionalPriceCents === undefined ||
      p.promotionalPriceCents === null ||
      p.promotionalPriceCents < p.basePriceCents,
    { message: 'Preço promocional deve ser MENOR que o preço base' },
  );
export type MenuProductUpdateInput = z.infer<typeof menuProductUpdateSchema>;

/**
 * Regra de consistência preço promocional < base também no update.
 * (aplicada no service sobre o estado resultante)
 */

// ---- Complementos -----------------------------------------------------------
const optionGroupBase = z
  .object({
    name: z.string().trim().min(2).max(60),
    required: z.boolean().default(false),
    minSelect: z.number().int().min(0).max(20).default(0),
    maxSelect: z.number().int().min(1).max(20).default(1),
    position: z.number().int().min(0).max(999).optional(),
  })
  .strict();

export const optionGroupInputSchema = optionGroupBase.refine(
  (g) => g.minSelect <= g.maxSelect,
  { message: 'minSelect deve ser <= maxSelect' },
);
export type OptionGroupInput = z.infer<typeof optionGroupInputSchema>;

export const optionInputSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    priceDeltaCents: z.number().int().min(0).max(100000).default(0), // acréscimos apenas
    active: z.boolean().default(true),
    position: z.number().int().min(0).max(999).optional(),
  })
  .strict();
export type OptionInput = z.infer<typeof optionInputSchema>;

/** Cria grupo COM as opções (transação única — evita grupos órfãos). */
export const optionGroupCreateSchema = optionGroupBase
  .extend({
    options: z.array(optionInputSchema).min(1).max(30),
  })
  .strict()
  .refine((g) => g.minSelect <= g.maxSelect, {
    message: 'minSelect deve ser <= maxSelect',
  });
export type OptionGroupCreate = z.infer<typeof optionGroupCreateSchema>;

// ---- Reordenação ------------------------------------------------------------
export const reorderSchema = z
  .object({
    ids: z.array(uuidSchema).min(1).max(500),
  })
  .strict();
export type ReorderInput = z.infer<typeof reorderSchema>;

// ---- Respostas (árvore do cardápio) -----------------------------------------
export const menuOptionSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  priceDeltaCents: z.number().int().min(0),
  active: z.boolean(),
  position: z.number().int(),
});
export type MenuOptionView = z.infer<typeof menuOptionSchema>;

export const menuOptionGroupSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  required: z.boolean(),
  minSelect: z.number().int(),
  maxSelect: z.number().int(),
  position: z.number().int(),
  options: z.array(menuOptionSchema),
});
export type MenuOptionGroupView = z.infer<typeof menuOptionGroupSchema>;

export const menuProductSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  basePriceCents: z.number().int().min(0),
  promotionalPriceCents: z.number().int().min(0).nullable(),
  imageUrl: z.string().nullable(),
  active: z.boolean(),
  paused: z.boolean(),
  isFeatured: z.boolean(),
  position: z.number().int(),
  optionGroups: z.array(menuOptionGroupSchema),
});
export type MenuProductView = z.infer<typeof menuProductSchema>;

export const menuCategorySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  active: z.boolean(),
  position: z.number().int(),
  products: z.array(menuProductSchema),
});
export type MenuCategoryView = z.infer<typeof menuCategorySchema>;

export const menuTreeSchema = z.object({
  categories: z.array(menuCategorySchema),
});
export type MenuTreeView = z.infer<typeof menuTreeSchema>;
