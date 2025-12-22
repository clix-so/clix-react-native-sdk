export declare enum PropertyType {
    String = "USER_PROPERTY_TYPE_STRING",
    Number = "USER_PROPERTY_TYPE_NUMBER",
    Boolean = "USER_PROPERTY_TYPE_BOOLEAN"
}
export declare class ClixUserProperty {
    readonly name: string;
    readonly valueString: any;
    readonly type: PropertyType;
    constructor(property: {
        name: string;
        valueString: any;
        type: PropertyType;
    });
    static of(name: string, value: any): ClixUserProperty;
    equals(other: ClixUserProperty): boolean;
    toString(): string;
}
//# sourceMappingURL=ClixUserProperty.d.ts.map