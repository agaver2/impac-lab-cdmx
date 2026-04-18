import type { ResolvedLocation } from "./cdmx/places";

export type DemoColony = {
  id: string;
  label: string;
  description: string;
  location: ResolvedLocation;
};

export const DEMO_COLONIES: DemoColony[] = [
  {
    id: "roma-norte",
    label: "Roma Norte",
    description: "Cuauhtémoc — vida cultural y gastronómica",
    location: {
      lat: 19.4155,
      lng: -99.1625,
      formattedAddress: "Roma Norte, Cuauhtémoc, CDMX",
      colonia: "Roma Norte",
      alcaldia: "CUAUHTEMOC",
      confidence: "high",
      source: "latlng",
    },
  },
  {
    id: "polanco",
    label: "Polanco",
    description: "Miguel Hidalgo — corporativo y lujo",
    location: {
      lat: 19.434,
      lng: -99.196,
      formattedAddress: "Polanco, Miguel Hidalgo, CDMX",
      colonia: "Polanco",
      alcaldia: "MIGUEL HIDALGO",
      confidence: "high",
      source: "latlng",
    },
  },
  {
    id: "doctores",
    label: "Doctores",
    description: "Cuauhtémoc — central, en transformación",
    location: {
      lat: 19.423,
      lng: -99.1466,
      formattedAddress: "Doctores, Cuauhtémoc, CDMX",
      colonia: "Doctores",
      alcaldia: "CUAUHTEMOC",
      confidence: "high",
      source: "latlng",
    },
  },
];

export function findDemoColony(id: string): DemoColony | undefined {
  return DEMO_COLONIES.find((c) => c.id === id);
}
