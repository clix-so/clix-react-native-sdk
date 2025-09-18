export enum PropertyType {
  String = 'USER_PROPERTY_TYPE_STRING',
  Number = 'USER_PROPERTY_TYPE_NUMBER',
  Boolean = 'USER_PROPERTY_TYPE_BOOLEAN',
}

export class ClixUserProperty {
  public readonly name: string;
  public readonly valueString: any;
  public readonly type: PropertyType;

  constructor(property: {
    name: string;
    valueString: any;
    type: PropertyType;
  }) {
    this.name = property.name;
    this.valueString = property.valueString;
    this.type = property.type;
  }

  static of(name: string, value: any): ClixUserProperty {
    let type: PropertyType;
    let codableValue: any;

    if (typeof value === 'boolean') {
      type = PropertyType.Boolean;
      codableValue = value;
    } else if (typeof value === 'number') {
      type = PropertyType.Number;
      codableValue = value;
    } else if (typeof value === 'string') {
      type = PropertyType.String;
      codableValue = value;
    } else {
      type = PropertyType.String;
      codableValue = value.toString();
    }

    return new ClixUserProperty({
      name,
      valueString: codableValue,
      type,
    });
  }

  equals(other: ClixUserProperty): boolean {
    return (
      this.name === other.name &&
      this.valueString === other.valueString &&
      this.type === other.type
    );
  }

  toString(): string {
    return `ClixUserProperty(name: ${this.name}, value: ${this.valueString}, type: ${this.type})`;
  }
}
