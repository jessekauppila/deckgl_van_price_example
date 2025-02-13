// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import { CompositeLayer } from '@deck.gl/core';
import { IconLayer, IconLayerProps } from '@deck.gl/layers';
import Supercluster from 'supercluster';

import type {
  PointFeature,
  ClusterFeature,
  ClusterProperties,
} from 'supercluster';
import type { UpdateParameters, PickingInfo } from '@deck.gl/core';

export type IconClusterLayerPickingInfo<DataT> = PickingInfo<
  DataT | (DataT & ClusterProperties),
  { objects?: DataT[] }
>;

function getIconName(size: number): string {
  if (size === 0) {
    return '';
  }
  if (size < 10) {
    return `marker-${size}`;
  }
  if (size < 100) {
    return `marker-${Math.floor(size / 10)}0`;
  }
  return 'marker-100';
}

function getIconSize(size: number): number {
  return Math.min(100, size) / 100 + 1;
}

export default class IconClusterLayer<
  DataT extends Record<string, unknown> = Record<string, unknown>,
  ExtraProps extends object = object
> extends CompositeLayer<
  Required<IconLayerProps<DataT>> & ExtraProps
> {
  static layerName = 'IconClusterLayer';

  state!: {
    data: (PointFeature<DataT> | ClusterFeature<DataT>)[];
    index: Supercluster<DataT, DataT>;
    z: number;
  };

  shouldUpdateState({ changeFlags }: UpdateParameters<this>) {
    return changeFlags.somethingChanged;
  }

  updateState({
    props,
    oldProps,
    changeFlags,
  }: UpdateParameters<this>) {
    const rebuildIndex =
      changeFlags.dataChanged ||
      props.sizeScale !== oldProps.sizeScale;

    if (rebuildIndex) {
      const index = new Supercluster<DataT, DataT>({
        maxZoom: 16,
        radius: props.sizeScale * Math.sqrt(2),
      });
      index.load(
        // @ts-expect-error Supercluster expects proper GeoJSON feature
        (props.data as DataT[]).map((d) => ({
          geometry: {
            coordinates: (
              props.getPosition as (d: DataT) => [number, number]
            )(d),
          },
          properties: d,
        }))
      );
      this.setState({ index });
    }

    const z = Math.floor(this.context.viewport.zoom);
    if (rebuildIndex || z !== this.state.z) {
      this.setState({
        data: this.state.index.getClusters([-180, -85, 180, 85], z),
        z,
      });
    }
  }

  getPickingInfo({
    info,
    mode,
  }: {
    info: PickingInfo<PointFeature<DataT> | ClusterFeature<DataT>>;
    mode: string;
  }): IconClusterLayerPickingInfo<DataT> {
    const pickedObject = info.object?.properties;
    if (pickedObject) {
      let objects: DataT[] | undefined;
      if (pickedObject.cluster && mode !== 'hover') {
        objects = this.state.index
          .getLeaves(pickedObject.cluster_id as number, 25)
          .map((f) => f.properties);
      }
      return { ...info, object: pickedObject, objects };
    }
    return { ...info, object: undefined };
  }

  renderLayers() {
    const { data } = this.state;
    const { iconAtlas, iconMapping, sizeScale } = this.props;

    return new IconLayer<PointFeature<DataT> | ClusterFeature<DataT>>(
      {
        data,
        iconAtlas,
        iconMapping,
        sizeScale,
        getPosition: (d) =>
          d.geometry.coordinates as [number, number],
        getIcon: (d) =>
          getIconName(
            d.properties.cluster
              ? (d.properties.point_count as number)
              : 1
          ),
        getSize: (d) =>
          getIconSize(
            d.properties.cluster
              ? (d.properties.point_count as number)
              : 1
          ),
      },
      this.getSubLayerProps({
        id: 'icon',
      })
    );
  }
}
