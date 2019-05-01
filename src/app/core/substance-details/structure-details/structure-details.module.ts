import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StructureDetailsComponent } from './structure-details.component';
import { DynamicComponentLoaderModule } from '../../dynamic-component-loader/dynamic-component-loader.module';
import {MatIconModule} from '@angular/material';
import {ReferencesManagerModule} from '../../references-manager/references-manager.module';

@NgModule({
  imports: [
    CommonModule,
    DynamicComponentLoaderModule.forChild(StructureDetailsComponent),
    MatIconModule,
    ReferencesManagerModule
  ],
  declarations: [
    StructureDetailsComponent
  ]
})
export class StructureDetailsModule { }