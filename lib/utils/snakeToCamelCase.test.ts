import { describe, expect, it } from "vitest";
import { snakeToCamelCase } from "./snakeToCamelCase";

describe("snakeToCamelCase", () => {
  it("converts properties from snake to camelCase", () => {
    const input = {
      first_name: "John",
      lastName: "Doe",
      contact_info: {
        phone_number: "123-456-7890",
        email_address: "john@example.com",
      },
      favorite_colors: ["deep_blue", "light_green"],
    };

    expect(snakeToCamelCase(input)).toStrictEqual({
      firstName: "John",
      lastName: "Doe",
      contactInfo: {
        phoneNumber: "123-456-7890",
        emailAddress: "john@example.com",
      },
      favoriteColors: ["deep_blue", "light_green"],
    });
  });
});
