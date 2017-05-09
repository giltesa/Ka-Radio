<?php
header('Access-Control-Allow-Origin: *');

$url   = "http://test.giltesa.com/karadio/php/yours/";    // http://karadio.karawin.fr/yours/

$yours = array(
    "01" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "FU9ONWVIW6PTYCR.LARGE.jpg"
        )
    ),
    "02" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "FAWGHEXIVHQM94E.LARGE.jpg"
        )
    ),
    "03" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "FXW48PHIVCVKDUN.LARGE.jpg"
        )
    ),
    "04" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "F64301MIW6PQHRY.LARGE.jpg"
        )
    ),
    "05" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "FLENTI0IVA4OKY5.LARGE.jpg"
        )
    ),
    "06" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "VhF9oSk.jpg"
        )
    ),
    "07" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "controlzigyf76vaw.jpg",
        )
    ),
    "08" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "prototype_front.jpg",
            "02" => "prototype_back.jpg"
        )
    ),
    "09" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "57a106e382.jpg",
            "02" => "2ac1ee5d6b.jpg",
            "03" => "img201612120628jz3gmtq9.jpg",
            "04" => "img20161212065qb3g16slf.jpg",
            "05" => "img201612120603jxpsolak.jpg"
        )
    ),
    "10" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "F7IPUHDIX6FRX5Z.LARGE.jpg"
        )
    ),
    "11" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "rkarner0.jpg"
        )
    ),
    "12" => array(
        "NAME" => "Dimitris",
        "LINK" => "https://github.com/dsaltas/WiFi-WebRadio",
        "DATE" => "2017/03/07",
        "ATCH" => array(
            "01" => "dimitris_01.jpg",
            "02" => "dimitris_02.png",
            "03" => "dimitris_03.png"
        )
    ),
    "13" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "tinykaradio73l6kfwe9o.jpg"
        )
    ),
    "14" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "20160728_065942.jpg"
        )
    ),
    "15" => array(
        "NAME" => "giltesa",
        "LINK" => "https://giltesa.com/?p=18015",
        "DATE" => "2017/03/25",
        "ATCH" => array(
            "01" => "giltesa_01.jpg",
            "02" => "giltesa_02.jpg",
            "03" => "giltesa_03.jpg",
            "04" => "giltesa_04.jpg",
            "05" => "https://www.youtube.com/embed/krWOcHQyDbA"
        )
    ),
    "16" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "polgrv.jpg"
        )
    ),
    "17" => array(
        "NAME" => "Lukas",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "lukas.jpg"
        )
    ),
    "18" => array(
        "NAME" => "Thomas",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "thomas.jpg",
            "02" => "Thomas1.jpg"
        )
    ),
    "19" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "fullsolution.jpg"
        )
    ),
    "20" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "stack.jpg"
        )
    ),
    "21" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "wooden.jpg"
        )
    ),
    "22" => array(
        "NAME" => "Frantz",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "frantz1.jpg",
            "02" => "frantz2.jpg"
        )
    ),
    "23" => array(
        "NAME" => "Rostislav",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "rostislav.jpg",
        )
    )/*,
    "24" => array(
        "NAME" => "",
        "LINK" => "",
        "DATE" => "",
        "ATCH" => array(
            "01" => "",
            "02" => "",
            "03" => ""
        )
    )*/
);
?>
<!DOCTYPE html>
<html>
<head>
    <!-- The following set of CSS and JS only uses if you visit the web directly, it is not used since Karadio. -->
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Karadio - Projects</title>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
    <link rel="stylesheet" href="http://fonts.googleapis.com/css?family=Roboto:300,400,500,700" type="text/css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.js"></script>
</head>

<body>

    <div class="row">
        <div class="col-md-12">

        <?php foreach( $yours as $key => $val ): ?>

            <div class="panel panel-default">
                <div class="panel-heading">
                    <div class="panel-title pull-left"><?php echo $yours[$key]["NAME"] . (!empty($yours[$key]["DATE"]) ? " - " . $yours[$key]["DATE"] : ""); ?></div>
                    <div class="text-right">
                        <?php if( !empty($yours[$key]["LINK"]) ): ?>
                            <a target="_blank" href="<?php echo $yours[$key]["LINK"]; ?>"><i class="material-icons theme">link</i></a>
                        <?php else: ?>
                            <label></label>
                        <?php endif; ?>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="row">

                        <?php foreach( $yours[$key]["ATCH"] as $key2 => $val2 ): ?>
                            <div class="col-xs-6 col-sm-4 col-lg-4">

                                <?php if( strpos($yours[$key]["ATCH"][$key2], 'youtube') ): ?>
                                    <div style="position:relative;height:0;padding-bottom:56.25%">
                                        <iframe src="<?php echo $yours[$key]["ATCH"][$key2]; ?>" frameborder="0" style="position:absolute;width:100%;height:100%;left:0" allowfullscreen></iframe>
                                    </div>
                                <?php else: ?>
                                    <a target="_blank" href="<?php echo $url . $yours[$key]["ATCH"][$key2]; ?>" class="thumbnail">
                                        <img src="<?php echo $url . $yours[$key]["ATCH"][$key2]; ?>" />
                                    </a>
                                <?php endif; ?>

                            </div>
                        <?php endforeach; ?>

                    </div>
                </div>
            </div>

        <?php endforeach; ?>

        </div>
    </div>

</body>
</html>