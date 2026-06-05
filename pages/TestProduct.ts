export interface TestProduct {
  name: string;
  parentProduct: string;
  category: string;
  deviceTechnology: string;
  lifeCycle: string;
  enableDesignControls?: boolean;
  modules?: ProductModule[];
}

export type ProductModule = 'Design Controls' | 'Risk Management';
