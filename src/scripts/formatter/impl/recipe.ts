import {b64tou, utob64} from "@/scripts/util";

interface RecipeLess24w10a {
    key?: {
        [key: string]: {
            item?: string,
            tag?: string
        }
    }
    ingredients?: {
        item?: string,
        tag?: string
    }[]
    ingredient?: {
        item?: string,
        tag?: string
    }
    result: {
        item: string,
        count?: number
    }
}

interface RecipeBetween24w10aTo24w33a {
    key?: {
        [key: string]: {
            item?: string,
            tag?: string
        }
    }
    ingredients?: {
        item?: string,
        tag?: string
    }[]
    ingredient?: {
        item?: string,
        tag?: string
    }
    result: {
        id: string,
        count: number
    }
}

interface RecipeMore24w33a {
    key?: {
        [key: string]: string
    }
    ingredients?: string[]
    ingredient?: string
    result: {
        id: string,
        count: number
    }
}

type Recipe = RecipeLess24w10a | RecipeBetween24w10aTo24w33a | RecipeMore24w33a;

export class RecipeFormatter {
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
                const value = recipe.key[keyKey]
                if (typeof (value) === "string") {
                    resultRecipe.key[keyKey] = value
                    continue
                }
                if (value.item) {
                    resultRecipe.key[keyKey] = value.item
                }
                if (value.tag) {
                    resultRecipe.key[keyKey] = `#${value.tag}`
                }
            }
        }
        if (recipe.ingredients) {
            resultRecipe.ingredients = []
            for (const ingredient of recipe.ingredients) {
                if (typeof (ingredient) === "string") {
                    resultRecipe.ingredients.push(ingredient)
                    continue
                }
                if (ingredient.item) {
                    resultRecipe.ingredients.push(ingredient.item)
                }
                if (ingredient.tag) {
                    resultRecipe.ingredients.push(`#${ingredient.tag}`)
                }
            }
        }
        if (recipe.ingredient) {
            if (typeof (recipe.ingredient) === "string") {
                resultRecipe.ingredient = recipe.ingredient
            } else {
                if (recipe.ingredient.item) {
                    resultRecipe.ingredient = recipe.ingredient.item
                }
                if (recipe.ingredient.tag) {
                    resultRecipe.ingredient = `#${recipe.ingredient.tag}`
                }
            }
        }
        if ((recipe.result as { item?: string }).item) {
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
                if (value.startsWith("#")) {
                    resultRecipe.key[convertRecipeKey] = {
                        tag: convertRecipe.key[convertRecipeKey].substring(1)
                    }
                } else {
                    resultRecipe.key[convertRecipeKey] = {
                        item: convertRecipe.key[convertRecipeKey]
                    }
                }
            }
        }
        if (convertRecipe.ingredients) {
            resultRecipe.ingredients = []
            for (const ingredient of convertRecipe.ingredients) {
                if (ingredient.startsWith("#")) {
                    resultRecipe.ingredients.push({
                        tag: ingredient.substring(1)
                    })
                } else {
                    resultRecipe.ingredients.push({
                        item: ingredient
                    })
                }
            }
        }
        if (convertRecipe.ingredient) {
            if (convertRecipe.ingredient.startsWith("#")) {
                resultRecipe.ingredient = {
                    tag: convertRecipe.ingredient.substring(1)
                }
            } else {
                resultRecipe.ingredient = {
                    item: convertRecipe.ingredient
                }
            }
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