
import { describe, expect, it } from "vitest";
import { getPackageServices } from "../utils/packageUtils";

describe("packageUtils", () => {
  describe("getPackageServices", () => {
    it("should return empty arrays when the package is not found", () => {
      const result = getPackageServices("non-existent", [], []);
      expect(result).toEqual([]);
    });

    it("should return base services for a package", () => {
      const packages = [
        {
          id: "pkg1",
          name: "Package 1",
          package_services: [
            { service: { id: "svc1", name: "Service 1" } },
            { service: { id: "svc2", name: "Service 2" } }
          ],
          is_customizable: false
        }
      ];
      
      const result = getPackageServices("pkg1", packages, []);
      expect(result.baseServices).toHaveLength(2);
      expect(result.customServices).toHaveLength(0);
    });

    it("should include customized services when package is customizable", () => {
      const packages = [
        {
          id: "pkg1",
          name: "Package 1",
          package_services: [
            { service: { id: "svc1", name: "Service 1" } }
          ],
          is_customizable: true
        }
      ];
      
      const result = getPackageServices("pkg1", packages, ["svc2", "svc3"]);
      expect(result.baseServices).toHaveLength(1);
      expect(result.customServices).toHaveLength(2);
    });

    it("should not include base services in custom services list", () => {
      const packages = [
        {
          id: "pkg1",
          name: "Package 1",
          package_services: [
            { service: { id: "svc1", name: "Service 1" } }
          ],
          is_customizable: true
        }
      ];
      
      const result = getPackageServices("pkg1", packages, ["svc1", "svc2"]);
      expect(result.baseServices).toHaveLength(1);
      expect(result.customServices).toHaveLength(1);
      expect(result.customServices[0]).toBe("svc2");
    });

    it("should not include custom services when package is not customizable", () => {
      const packages = [
        {
          id: "pkg1",
          name: "Package 1",
          package_services: [
            { service: { id: "svc1", name: "Service 1" } }
          ],
          is_customizable: false
        }
      ];
      
      const result = getPackageServices("pkg1", packages, ["svc2", "svc3"]);
      expect(result.baseServices).toHaveLength(1);
      expect(result.customServices).toHaveLength(0);
    });
  });
});
