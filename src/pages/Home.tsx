import { useEffect, useState } from "react";
import { Button, Grid, Typography } from "@mui/material";
import { useWeb3React } from "@web3-react/core";
import { Web3Provider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";
import Opensea from "../abis/Opensea.json";
import ERC721 from "../abis/ERC721.json";
import ERC1155 from "../abis/ERC1155.json";
import { InjectedConnector } from "@web3-react/injected-connector";
import axios from "axios";
import { ethers } from "ethers";
import APESAFE from "../APESAFE.png";

const appChainId = 1;
const openseaProxyAddress = "0x294de5A681245e97A7CB1425F73C9513f1B4a7fd";
const x2y2Address = "0xF849de01B080aDC3A814FaBE1E2087475cF2E354";

function Home() {
  const { account, library, activate } = useWeb3React<Web3Provider>();
  const [openseaContract, setOpenseaContract] = useState(
    new Contract(Opensea.address, Opensea.abi, library?.getSigner())
  );
  const [nftAssets, setNftAssets] = useState<any[]>([]);
  const [numNfts, setNumNfts] = useState<Number>(100000);

  const injectedConnector = new InjectedConnector({
    supportedChainIds: [appChainId],
  });

  useEffect(() => {
    if (!library || !account) return;
    setOpenseaContract(
      new Contract(Opensea.address, Opensea.abi, library?.getSigner())
    );
  }, [library, account]);

  const connectWallet = async () => {
    await activate(injectedConnector);
  };

  useEffect(() => {
    connectWallet();
    // eslint-disable-next-line
  }, []);

  const getOpenseaData = async () => {
    setNftAssets([]);
    const account = await library?.getSigner().getAddress()!;
    const res = await axios.get(
      `https://api.opensea.io/api/v1/assets?owner=${account}`
    );
    const assets = res.data.assets;
    setNumNfts(res.data.assets.length);

    /* Return if */
    if (res.data.assets.length === 0) {
      return;
    }
    for (var i = 0; i < assets.length; i++) {
      const asset: any = assets[i];

      const contractAddress = asset.asset_contract.address;
      const url = `https://api.opensea.io/api/v1/asset/${contractAddress}/${asset.token_id}`;
      const res = await axios.get(url);

      const orders = res.data.orders;
      const erc721Contract = new Contract(
        contractAddress,
        ERC721,
        library?.getSigner()
      );
      const erc1155Contract = new Contract(
        contractAddress,
        ERC1155,
        library?.getSigner()
      );
      const safe_asset = {
        address: contractAddress,
        name: `${asset.collection.name}`,
        token_id: asset.token_id,
        contractAllowedOpensea: false,
        contractAllowedX2Y2: false,
        openseaActiveListing: false,
        openseaActiveListingBelowFloor: false,
        openseaMinListing: 1000000,
      };

      for (var j = 0; j < orders.length; j++) {
        const order = orders[j];
        const args = [
          [
            order.exchange,
            order.maker.address,
            order.taker.address,
            order.fee_recipient.address,
            order.target,
            order.static_target,
            order.payment_token,
          ],
          [
            order.maker_relayer_fee,
            order.taker_relayer_fee,
            order.maker_protocol_fee,
            order.taker_protocol_fee,
            order.base_price,
            order.extra,
            order.listing_time,
            order.expiration_time,
            order.salt,
          ],
          order.fee_method,
          order.side,
          order.sale_kind,
          order.how_to_call,
          order.calldata,
          order.replacement_pattern,
          order.static_extradata,
          order.v,
          order.r,
          order.s,
        ];

        /* Verify opensea isn't full of shit */
        const owns =
          asset.asset_contract.schema_name === "ERC1155"
            ? (await erc1155Contract.balanceOf(account, asset.token_id)) > 0
            : (await erc721Contract.ownerOf(asset.token_id)) === account;

        /* Continue loop if seller address does not match current owner */
        if (
          ethers.utils.getAddress(order.maker.address) !==
            ethers.utils.getAddress(account) &&
          owns
        ) {
          continue;
        }

        /* Check if order is not valid */
        safe_asset.openseaActiveListing =
          (await openseaContract.validateOrder_(...args)) &&
          order.payment_token_contract.id === 1;

        /* Check if listing is above floor price */
        const collection = await axios.get(
          `https://api.opensea.io/api/v1/collection/${asset.collection.slug}`
        );

        safe_asset.openseaActiveListingBelowFloor =
          Number(collection.data.collection.stats.floor_price) >
            Number(ethers.utils.formatUnits(order.base_price, 18)) &&
          safe_asset.openseaActiveListing;

        safe_asset.openseaMinListing = Math.min(
          Number(ethers.utils.formatUnits(order.base_price, 18)),
          safe_asset.openseaMinListing
        );
      }

      /* Check if contract is approved to withdraw NFT */
      safe_asset.contractAllowedOpensea = await erc721Contract.isApprovedForAll(
        account,
        openseaProxyAddress
      );
      // console.log(erc721Contract.isApprovedForAll(account,
      //   x2y2Address))
      safe_asset.contractAllowedX2Y2 = await erc721Contract.isApprovedForAll(
        account,
        x2y2Address
      );

      setNftAssets((oldAssets) => [...oldAssets, safe_asset]);
    }
  };

  return (
    <div>
      <Grid container>
        <Grid
          item
          xs={12}
          style={{
            textAlign: "center",
          }}
        >
          <img src={APESAFE} alt="APESAFE LOGO" style={{ height: "100px" }} />
        </Grid>
        <Grid
          item
          xs={12}
          style={{
            textAlign: "center",
          }}
        >
          <br /> <br />
          <Button onClick={connectWallet}>
            {!account
              ? "Connect Wallet"
              : `${account?.substring(0, 6)}...${account?.substring(
                  38,
                  42
                )}`.toLocaleLowerCase()}
          </Button>
          {!!account ? (
            <div>
              <Button onClick={getOpenseaData}>click for how safu</Button>
            </div>
          ) : (
            ""
          )}
          <br /> <br />
          <Typography>
            I'm tired of apes and other NFTs being stolen. Check if your NFT is
            mostly safu or kinda sifu.
            <br />
            Anyone with more information on attack vectors being exploited, DM
            @_dmda_ on twitter
          </Typography>
          <Grid container>
            <Grid
              item
              xs={12}
              style={{
                textAlign: "center",
              }}
            >
              <br />
              <br />
              {numNfts === 0 ? (
                <Typography>You have no NFTs. You are rekt.</Typography>
              ) : numNfts === 100000 ? (
                ""
              ) : (
                <Grid container>
                  <Grid item xs={3}>
                    <Typography>NFT Collection Name</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography>Token Id</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography>
                      Approved Opensea contract for transfer?
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography>Active Opensea Listing?</Typography>
                  </Grid>
                  <br /> <br />
                  <Grid item xs={12}>
                    <Typography>
                      --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                    </Typography>
                  </Grid>
                </Grid>
              )}
              {nftAssets.map((nft) => (
                <Grid container>
                  <Grid item xs={3}>
                    <Typography>{nft.name}</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography>
                      {nft.token_id.length < 7
                        ? nft.token_id
                        : nft.token_id.substring(0, 3) +
                          "..." +
                          nft.token_id.substring(-2, -1)}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>

                  {!nft.contractAllowedOpensea ? (
                      <Typography color={"#00bb00"}>
                        Not Approved on Opensea
                      </Typography>
                  ) : (
                    <>
                        <Typography color={"#ddbb00"}>
                          Approved for sale
                        </Typography>
                        <Button
                          onClick={async () => {
                            const erc721Contract = new Contract(
                              nft.address,
                              ERC721,
                              library?.getSigner()
                            );
                            await erc721Contract.setApprovalForAll(
                              openseaProxyAddress,
                              false
                            );
                          }}
                          variant="outlined"
                        >
                          Revoke Approval Opensea
                        </Button>
                    </>
                  )}
                  {!nft.contractAllowedX2Y2 ? (
                      <Typography color={"#00bb00"}>
                        Not Approved on X2Y2
                      </Typography>
                  ) : (
                    <>
                        <Typography color={"#ddbb00"}>
                          Approved for sale
                        </Typography>
                        <Button
                          onClick={async () => {
                            const erc721Contract = new Contract(
                              nft.address,
                              ERC721,
                              library?.getSigner()
                            );
                            await erc721Contract.setApprovalForAll(
                              x2y2Address,
                              false
                            );
                          }}
                          variant="outlined"
                        >
                          Revoke Approval X2Y2
                        </Button>
                    </>
                  )}
                  </Grid>
                  <Grid item xs={3}>
                    {nft.openseaActiveListing ? (
                      <Typography
                        color={
                          nft.openseaActiveListingBelowFloor
                            ? "#00bb00"
                            : "#ddbb00"
                        }
                      >
                        Active Listing for {nft.openseaMinListing}Ξ
                      </Typography>
                    ) : (
                      <Typography color={"#00bb00"}>
                        No Active Listing
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              ))}{" "}
            </Grid>
          </Grid>
        </Grid>
        <Grid
          item
          xs={12}
          style={{
            // textAlign: "center",
            position: "relative",
            // left: "50%",
            bottom: "10px",
            transform: "translate(-50%, -50%)",
            marginTop: "50px",
          }}
        >
          <Typography>
            Tips welcome at 0x792c22EB036372007b37367ed50f164736034480 ❤️
          </Typography>
        </Grid>
      </Grid>
    </div>
  );
}

export default Home;
