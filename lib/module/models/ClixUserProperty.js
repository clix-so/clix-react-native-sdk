"use strict";

export let PropertyType = /*#__PURE__*/function (PropertyType) {
  PropertyType["String"] = "USER_PROPERTY_TYPE_STRING";
  PropertyType["Number"] = "USER_PROPERTY_TYPE_NUMBER";
  PropertyType["Boolean"] = "USER_PROPERTY_TYPE_BOOLEAN";
  return PropertyType;
}({});
export class ClixUserProperty {
  constructor(property) {
    this.name = property.name;
    this.valueString = property.valueString;
    this.type = property.type;
  }
  static of(name, value) {
    let type;
    let codableValue;
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
      type
    });
  }
  equals(other) {
    return this.name === other.name && this.valueString === other.valueString && this.type === other.type;
  }
  toString() {
    return `ClixUserProperty(name: ${this.name}, value: ${this.valueString}, type: ${this.type})`;
  }
}
//# sourceMappingURL=ClixUserProperty.js.map