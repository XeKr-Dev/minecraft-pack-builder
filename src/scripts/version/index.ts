import mc_version from "@/minecraft_version.json";

const mcVersions: {
    [key: string]: {
        datapack_version: number,
        resources_version: number
    }
} = mc_version

const mcVersionKeys = Object.keys(mcVersions)

export class Version {
    public static readonly POSITIVE_INFINITY = new Version(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    public static readonly NEGATIVE_INFINITY = new Version(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    private readonly major: number;
    private readonly minor: number;
    private readonly patch: number;

    constructor(major: number, minor: number, patch: number) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }

    public toString(): string {
        return `${this.major}.${this.minor}.${this.patch}`;
    }

    public compare(other: Version): number {
        return this.major - other.major || this.minor - other.minor || this.patch - other.patch;
    }

    public static fromString(version: string): Version {
        const parts = version.split('.');
        return new Version(parseInt(parts[0] || '0'), parseInt(parts[1] || '0'), parseInt(parts[2] || '0'));
    }

    public static compareMC(mcv1: string, mcv2: string): number {
        const index1 = mcVersionKeys.indexOf(mcv2)
        const index2 = mcVersionKeys.indexOf(mcv1)
        if (index1 === -1 || index2 === -1) throw new Error(`Unknown Minecraft version: ${mcv1} or ${mcv2}`)
        return index1 - index2
    }
}

export class VersionRange {
    public static readonly ANY = new VersionRange(Version.NEGATIVE_INFINITY, true, Version.POSITIVE_INFINITY, true);
    private readonly min: Version;
    private readonly containMin: boolean;
    private readonly max: Version;
    private readonly containMax: boolean;

    constructor(min: Version, containMin: boolean, max: Version, containMax: boolean) {
        this.min = min;
        this.containMin = containMin;
        this.max = max;
        this.containMax = containMax;
    }

    public toString(): string {
        return `${this.containMin ? '[' : '('}${this.min.toString()}, ${this.max.toString()}${this.containMax ? ']' : ')'}`;
    }

    public contains(version: Version): boolean {
        return (this.min.compare(version) <= 0 && (this.containMin || this.min.compare(version) < 0)) &&
            (this.max.compare(version) >= 0 && (this.containMax || this.max.compare(version) > 0));
    }

    public static fromString(range: string): VersionRange {
        if (range === '*') return VersionRange.ANY;
        else if (
            (range.startsWith('[') || range.startsWith('('))
            && (range.endsWith(']') || range.endsWith(')'))
        ) {
            const containMin = range.startsWith('[')
            const containMax = range.endsWith(']')
            const parts = range.substring(1, range.length - 1).split(',');
            const min = parts[0] === '' ? Version.NEGATIVE_INFINITY : Version.fromString(parts[0]);
            const max = parts[1] === '' ? Version.POSITIVE_INFINITY : Version.fromString(parts[1]);
            return new VersionRange(min, containMin, max, containMax)
        } else if (range.startsWith('>=')) {
            return new VersionRange(Version.fromString(range.substring(2)), true, Version.POSITIVE_INFINITY, false)
        } else if (range.startsWith('>')) {
            return new VersionRange(Version.fromString(range.substring(1)), false, Version.POSITIVE_INFINITY, false)
        } else if (range.startsWith('<=')) {
            return new VersionRange(Version.NEGATIVE_INFINITY, false, Version.fromString(range.substring(2)), true)
        } else if (range.startsWith('<')) {
            return new VersionRange(Version.NEGATIVE_INFINITY, false, Version.fromString(range.substring(1)), false)
        } else {
            return new VersionRange(Version.fromString(range), true, Version.fromString(range), true)
        }
    }
}