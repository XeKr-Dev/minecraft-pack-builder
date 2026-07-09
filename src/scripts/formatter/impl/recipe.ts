import {b64tou, utob64} from "@/scripts/util";

type IngredientObject = {
    item?: string,
    tag?: string
}

type RecipeIngredient = string | IngredientObject | RecipeIngredient[]
type ObjectIngredient = IngredientObject | ObjectIngredient[]
type ModernIngredient = string | ModernIngredient[]

interface RecipeLess24w10a {
    key?: {
        [key: string]: RecipeIngredient
    }
    ingredients?: RecipeIngredient[]
    ingredient?: RecipeIngredient
    result: {
        item: string,
        count?: number
    } | string
}

interface RecipeBetween24w10aTo24w33a {
    key?: {
        [key: string]: ObjectIngredient
    }
    ingredients?: ObjectIngredient[]
    ingredient?: ObjectIngredient
    result: {
        id: string,
        count: number
    }
}

interface RecipeMore24w33a {
    key?: {
        [key: string]: ModernIngredient
    }
    ingredients?: ModernIngredient[]
    ingredient?: ModernIngredient
    result: {
        id: string,
        count: number
    }
}

type Recipe = RecipeLess24w10a | RecipeBetween24w10aTo24w33a | RecipeMore24w33a;

export class RecipeFormatter {
    private static toModernIngredient(ingredient: RecipeIngredient): ModernIngredient | undefined {
        if (typeof (ingredient) === "string") {
            return ingredient
        }
        if (ingredient instanceof Array) {
            return ingredient
                .map(value => RecipeFormatter.toModernIngredient(value))
                .filter((value): value is ModernIngredient => value !== undefined)
        }
        if (ingredient.item) {
            return ingredient.item
        }
        if (ingredient.tag) {
            return `#${ingredient.tag}`
        }
        return undefined
    }

    private static toObjectIngredient(ingredient: ModernIngredient): ObjectIngredient {
        if (ingredient instanceof Array) {
            return ingredient.map(value => RecipeFormatter.toObjectIngredient(value))
        }
        if (ingredient.startsWith("#")) {
            return {
                tag: ingredient.substring(1)
            }
        }
        return {
            item: ingredient
        }
    }

    private static preprocess(recipe: Recipe): { [key: string]: any } {
        const data: {
            key?: any
            ingredients?: any
            ingredient?: any
            result?: any
            [key: string]: any
        } = {
            ...recipe
        }
        if (data.key) delete data.key
        if (data.ingredients) delete data.ingredients
        if (data.ingredient) delete data.ingredient
        if (data.result) delete data.result
        return data
    }

    private static toMore24w33a(recipe: Recipe): RecipeMore24w33a {
        const resultRecipe: RecipeMore24w33a = {
            ...RecipeFormatter.preprocess(recipe)
        } as RecipeMore24w33a
        if (recipe.key) {
            resultRecipe.key = {}
            for (const keyKey in recipe.key) {
                const value = RecipeFormatter.toModernIngredient(recipe.key[keyKey])
                if (value !== undefined) {
                    resultRecipe.key[keyKey] = value
                }
            }
        }
        if (recipe.ingredients) {
            resultRecipe.ingredients = []
            for (const ingredient of recipe.ingredients) {
                const value = RecipeFormatter.toModernIngredient(ingredient)
                if (value !== undefined) {
                    resultRecipe.ingredients.push(value)
                }
            }
        }
        if (recipe.ingredient) {
            const value = RecipeFormatter.toModernIngredient(recipe.ingredient)
            if (value !== undefined) {
                resultRecipe.ingredient = value
            }
        }
        if (typeof (recipe.result) === "string") {
            resultRecipe.result = {
                id: recipe.result,
                count: (recipe.result as { count?: number }).count ?? 1
            }
        } else if ((recipe.result as { item?: string }).item) {
            resultRecipe.result = {
                id: (recipe.result as { item: string }).item,
                count: (recipe.result as { count?: number }).count ?? 1
            }
        } else {
            resultRecipe.result = recipe.result as { id: string, count: number }
        }
        return resultRecipe;
    }

    private static toBetween24w10aTo24w33a(recipe: Recipe): RecipeBetween24w10aTo24w33a {
        let convertRecipe: RecipeMore24w33a = RecipeFormatter.toMore24w33a(recipe)
        const resultRecipe: RecipeBetween24w10aTo24w33a = {
            ...RecipeFormatter.preprocess(recipe)
        } as RecipeBetween24w10aTo24w33a
        if (convertRecipe.key) {
            resultRecipe.key = {}
            for (const convertRecipeKey in convertRecipe.key) {
                const value = convertRecipe.key[convertRecipeKey]
                resultRecipe.key[convertRecipeKey] = RecipeFormatter.toObjectIngredient(value)
            }
        }
        if (convertRecipe.ingredients) {
            resultRecipe.ingredients = []
            for (const ingredient of convertRecipe.ingredients) {
                resultRecipe.ingredients.push(RecipeFormatter.toObjectIngredient(ingredient))
            }
        }
        if (convertRecipe.ingredient) {
            resultRecipe.ingredient = RecipeFormatter.toObjectIngredient(convertRecipe.ingredient)
        }
        resultRecipe.result = convertRecipe.result
        return resultRecipe;
    }

    private static toLess24w10a(recipe: Recipe): RecipeLess24w10a {
        let convertRecipe: RecipeBetween24w10aTo24w33a = RecipeFormatter.toBetween24w10aTo24w33a(recipe)
        const resultRecipe: RecipeLess24w10a = {
            ...RecipeFormatter.preprocess(recipe)
        } as RecipeLess24w10a
        if (convertRecipe.key) {
            resultRecipe.key = convertRecipe.key
        }
        if (convertRecipe.ingredients) {
            resultRecipe.ingredients = convertRecipe.ingredients
        }
        if (convertRecipe.ingredient) {
            resultRecipe.ingredient = convertRecipe.ingredient
        }
        if (convertRecipe.result) {
            resultRecipe.result = {
                item: convertRecipe.result.id,
                count: convertRecipe.result.count
            }
        }
        return resultRecipe;
    }

    public static format(
        content: string,
        version: {
            datapack_version: number,
            resources_version: number
        }
    ): string {
        let recipe: Recipe = JSON.parse(b64tou(content))
        if (version.datapack_version >= 49) {
            recipe = RecipeFormatter.toMore24w33a(recipe)
        } else if (version.datapack_version >= 34) {
            recipe = RecipeFormatter.toBetween24w10aTo24w33a(recipe)
        } else {
            recipe = RecipeFormatter.toLess24w10a(recipe)
        }
        return utob64(JSON.stringify(recipe, null, 4))
    }
}
