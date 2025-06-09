import * as React from 'react';
import { PageClientImpl } from './PageClientImpl';
import { isVideoCodec } from '@/lib/types';
import { MyProvider } from '@/state_mangement/MyProvider';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ roomName: string }>;
  searchParams: Promise<{
    // FIXME: We should not allow values for regions if in playground mode.
    region?: string;
    hq?: string;
    codec?: string;
  }>;
}) {

  const _params = await params;
  const _searchParams = await searchParams;
  const codec =
    typeof _searchParams.codec === 'string' && isVideoCodec(_searchParams.codec)
      ? _searchParams.codec
      : 'vp9';
  const hq = _searchParams.hq === 'true' ? true : false;

  console.log((_params.roomName).split('%24')[0])

  return (
    <>
      <MyProvider>
        <PageClientImpl
          roomName={(_params.roomName).split('%24')[0]}
          region={_searchParams.region}
          hq={hq}
          codec={codec}
          where={(_params.roomName).split('%24')[1]}
        />
      </MyProvider>
    </>
  );
}
